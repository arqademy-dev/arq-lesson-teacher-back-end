import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/config/db.js';
import { topics, classes } from '../src/db/schema.js';

async function backfill() {
  const allTopics = await db.select().from(topics);
  let updated = 0;

  for (const topic of allTopics) {
    if (topic.subjectId) continue; // already set, skip

    const [classRow] = await db.select().from(classes).where(eq(classes.id, topic.classId)).limit(1);
    const oldSubjectId = (classRow as any)?.subjectId; // reading the soon-to-be-removed column

    if (oldSubjectId) {
      await db.update(topics).set({ subjectId: oldSubjectId }).where(eq(topics.id, topic.id));
      updated++;
    } else {
      console.warn(`No subjectId found for topic ${topic.id} (class ${topic.classId}) — leaving null, fix manually.`);
    }
  }

  console.log(`Backfilled ${updated} of ${allTopics.length} topics.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});