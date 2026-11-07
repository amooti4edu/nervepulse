import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const alice = uuid(1),
  bob = uuid(2),
  outsider = uuid(3),
  carol = uuid(4);
const org = uuid(10),
  otherOrg = uuid(11),
  space = uuid(20),
  signal = uuid(30),
  comment = uuid(40),
  secondComment = uuid(41);

test("collaboration migration: notification delivery and access boundaries", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("./fixtures/collaboration.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`
      INSERT INTO people VALUES ('${alice}'), ('${bob}'), ('${outsider}'), ('${carol}');
      INSERT INTO spaces VALUES ('${space}');
      INSERT INTO org_memberships VALUES ('${alice}', '${org}', '${space}'), ('${bob}', '${org}', '${space}'), ('${carol}', '${org}', '${space}'), ('${outsider}', '${otherOrg}', NULL);
      INSERT INTO signals(id, organization_id, created_by, owner_id) VALUES ('${signal}', '${org}', '${alice}', '${alice}');
    `);
    await db.exec("CREATE PUBLICATION supabase_realtime");
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260916110000_collaboration_ux.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'",
        )
      ).rows.length,
      6,
    );
    const as = async (person) => {
      await db.exec("RESET ROLE");
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [
        person,
      ]);
      await db.exec("SET ROLE authenticated");
    };
    const rows = async (sql, args = []) => (await db.query(sql, args)).rows;

    await t.test(
      "existing creators follow automatically; a user can follow only as themselves",
      async () => {
        await as(alice);
        assert.equal((await rows("SELECT * FROM signal_followers")).length, 1);
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO signal_followers(signal_id, person_id) VALUES ($1, $2)",
              [signal, bob],
            ),
          /row-level security/,
        );
        await as(bob);
        await db.query(
          "INSERT INTO signal_followers(signal_id, person_id) VALUES ($1, $2)",
          [signal, bob],
        );
        assert.equal((await rows("SELECT * FROM signal_followers")).length, 1);
      },
    );

    await t.test(
      "outsiders cannot follow or mention people on inaccessible signals",
      async () => {
        await as(outsider);
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO signal_followers(signal_id, person_id) VALUES ($1, $2)",
              [signal, outsider],
            ),
          /row-level security/,
        );
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO signal_mentions(signal_id, person_id, mentioned_by) VALUES ($1, $2, $3)",
              [signal, alice, outsider],
            ),
          /row-level security/,
        );
        await as(alice);
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO signal_mentions(signal_id, person_id, mentioned_by) VALUES ($1, $2, $3)",
              [signal, outsider, alice],
            ),
          /row-level security/,
        );
      },
    );

    await t.test("replies notify followers, never the sender", async () => {
      await as(alice);
      await db.query(
        "INSERT INTO signal_comments(id, signal_id, author_id, body) VALUES ($1, $2, $3, 'First reply')",
        [comment, signal, alice],
      );
      assert.equal((await rows("SELECT * FROM notifications")).length, 0);
      await as(bob);
      const alerts = await rows("SELECT kind, comment_id FROM notifications");
      assert.deepEqual(alerts, [{ kind: "comment", comment_id: comment }]);
      await as(alice);
      await db.query(
        "INSERT INTO signal_comments(id, signal_id, author_id, body) VALUES ($1, $2, $3, 'Second reply')",
        [secondComment, signal, alice],
      );
    });

    await t.test(
      "a mention replaces only its own unread reply alert, without erasing later replies",
      async () => {
        await as(alice);
        await db.query(
          "INSERT INTO signal_mentions(signal_id, person_id, mentioned_by, comment_id) VALUES ($1, $2, $3, $4)",
          [signal, bob, alice, comment],
        );
        await as(bob);
        const alerts = await rows(
          "SELECT kind, comment_id FROM notifications ORDER BY kind",
        );
        assert.deepEqual(alerts, [
          { kind: "comment", comment_id: secondComment },
          { kind: "mention", comment_id: comment },
        ]);
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO signal_mentions(signal_id, person_id, mentioned_by, comment_id) VALUES ($1, $2, $3, $4)",
              [signal, alice, bob, comment],
            ),
          /row-level security/,
        );
      },
    );

    await t.test(
      "read changes affect only the chosen notification and cannot affect another person",
      async () => {
        await as(bob);
        const [alert] = await rows(
          "SELECT id FROM notifications WHERE kind = 'mention'",
        );
        await db.query("UPDATE notifications SET read = true WHERE id = $1", [
          alert.id,
        ]);
        assert.equal(
          (await rows("SELECT * FROM notifications WHERE NOT read")).length,
          1,
        );
        await db.query("UPDATE notifications SET read = false WHERE id = $1", [
          alert.id,
        ]);
        assert.equal(
          (await rows("SELECT * FROM notifications WHERE NOT read")).length,
          2,
        );
        await as(alice);
        await db.query("UPDATE notifications SET read = true WHERE id = $1", [
          alert.id,
        ]);
        await as(bob);
        assert.equal(
          (
            await rows("SELECT read FROM notifications WHERE id = $1", [
              alert.id,
            ])
          )[0].read,
          false,
        );
      },
    );

    await t.test(
      "unfollow stops reply and status alerts, but not direct mentions or assignments",
      async () => {
        await as(bob);
        await db.query(
          "DELETE FROM signal_followers WHERE signal_id = $1 AND person_id = $2",
          [signal, bob],
        );
        const before = (await rows("SELECT * FROM notifications")).length;
        await as(alice);
        await db.query(
          "INSERT INTO signal_comments(signal_id, author_id, body) VALUES ($1, $2, 'Third reply')",
          [signal, alice],
        );
        await db.query(
          "UPDATE signals SET status = 'acknowledged' WHERE id = $1",
          [signal],
        );
        await as(bob);
        assert.equal(
          (await rows("SELECT * FROM notifications")).length,
          before,
        );
        await as(alice);
        await db.query(
          "INSERT INTO signal_mentions(signal_id, person_id, mentioned_by) VALUES ($1, $2, $3)",
          [signal, bob, alice],
        );
        await db.query("UPDATE signals SET owner_id = $1 WHERE id = $2", [
          bob,
          signal,
        ]);
        await as(bob);
        assert.equal(
          (await rows("SELECT * FROM notifications")).length,
          before + 2,
        );
        assert.equal((await rows("SELECT * FROM signal_followers")).length, 1);
      },
    );

    await t.test("status changes notify current followers", async () => {
      await as(alice);
      await db.query(
        "UPDATE signals SET status = 'in_progress' WHERE id = $1",
        [signal],
      );
      await as(bob);
      assert.equal(
        (
          await rows(
            "SELECT * FROM notifications WHERE kind = 'status_changed'",
          )
        ).length,
        1,
      );
    });

    await t.test(
      "new signals automatically subscribe their creator",
      async () => {
        await as(alice);
        const id = uuid(31);
        await db.query(
          "INSERT INTO signals(id, organization_id, created_by, owner_id) VALUES ($1, $2, $3, $3)",
          [id, org, alice],
        );
        assert.equal(
          (
            await rows("SELECT * FROM signal_followers WHERE signal_id = $1", [
              id,
            ])
          ).length,
          1,
        );
      },
    );

    await t.test(
      "forwards notify the person or primary-space members without changing ownership",
      async () => {
        await as(alice);
        await db.query(
          "INSERT INTO signal_forwards(signal_id, forwarded_by, forwarded_to_space) VALUES ($1, $2, $3)",
          [signal, alice, space],
        );
        assert.equal(
          (
            await rows("SELECT owner_id FROM signals WHERE id = $1", [signal])
          )[0].owner_id,
          bob,
        );
        await as(carol);
        assert.equal(
          (await rows("SELECT * FROM notifications WHERE kind = 'forward'"))
            .length,
          1,
        );
        await as(alice);
        await db.query(
          "INSERT INTO signal_forwards(signal_id, forwarded_by, forwarded_to_person) VALUES ($1, $2, $3)",
          [signal, alice, carol],
        );
        await as(carol);
        assert.equal(
          (await rows("SELECT * FROM notifications WHERE kind = 'forward'"))
            .length,
          2,
        );
      },
    );

    await t.test(
      "a notification or stale follow never grants signal access; unfollow still works after access loss",
      async () => {
        await as(alice);
        await db.query(
          "UPDATE signals SET visibility = 'restricted', owner_id = $1 WHERE id = $2",
          [alice, signal],
        );
        await as(bob);
        assert.equal(
          (await rows("SELECT * FROM signals WHERE id = $1", [signal])).length,
          0,
        );
        assert.equal((await rows("SELECT * FROM signal_followers")).length, 0);
        await db.query(
          "DELETE FROM signal_followers WHERE signal_id = $1 AND person_id = $2",
          [signal, bob],
        );
        await as(outsider);
        assert.equal((await rows("SELECT * FROM notifications")).length, 0);
        await assert.rejects(
          () =>
            db.query("SELECT deliver_signal_notification($1, $2, 'mention')", [
              signal,
              outsider,
            ]),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
