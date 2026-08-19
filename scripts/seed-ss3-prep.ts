import 'dotenv/config';
import { db } from '../src/config/db.js';
import { topics, resources, interactiveElements } from '../src/db/schema.js';

const SHARED_SUBJECT_ID = '2f37d93e-ed33-4abb-913d-0fe9ce0d099f';
const JAMB_CLASS_ID = '27dfa8cf-700c-4bc2-bf0d-bff9ffc1b73c';
const WAEC_CLASS_ID = '3afe96b7-9a16-43c6-a2c1-276bb08dd992';

interface QuizQ {
  q: string;
  options: string[];
  correct: string;
}

interface WeekSeed {
  title: string;
  uploadInstructions: string;
  quizQuestions: [QuizQ, QuizQ, QuizQ];
}

async function seedClass(classId: string, weeks: WeekSeed[]) {
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];

    const [topicRow] = await db
      .insert(topics)
      .values({ classId, title: w.title, description: `Weekly focus: ${w.title}`, sortOrder: i + 1, expectedDurationDays: 5 })
      .returning();

    // Monday - Thursday: daily practice upload
    for (let day = 1; day <= 4; day++) {
      const [uploadResource] = await db
        .insert(resources)
        .values({
          topicId: topicRow.id,
          title: `Day ${day} Practice Upload`,
          resourceType: 'submission',
          urlOrPath: '',
          dayNumber: day,
          sortOrder: 1,
        })
        .returning();

      await db.insert(interactiveElements).values({
        resourceId: uploadResource.id,
        interactionType: 'file_upload',
        pauseOnTrigger: true,
        configSchema: {
          instructions: `${w.uploadInstructions} Upload your worked solutions (photo or scanned file) for today's practice.`,
          allowFile: true,
          allowText: true,
          maxFiles: 3,
        },
        correctAnswers: {},
      });
    }

    // Friday: quiz on the week's topic
    const [quizResource] = await db
      .insert(resources)
      .values({ topicId: topicRow.id, title: `${w.title} — Quiz`, resourceType: 'quiz', urlOrPath: '', dayNumber: 5, sortOrder: 1 })
      .returning();

    await db.insert(interactiveElements).values(
      w.quizQuestions.map((qq) => ({
        resourceId: quizResource.id,
        interactionType: 'multiple_choice' as const,
        configSchema: { question: qq.q, options: qq.options },
        correctAnswers: { answer: qq.correct },
      }))
    );

    console.log(`Seeded: ${w.title}`);
  }
}

const jambWeeks: WeekSeed[] = [
  {
    title: 'Week 1: Indices and Logarithms',
    uploadInstructions: 'Practice simplifying expressions using laws of indices and logarithms.',
    quizQuestions: [
      { q: 'What is x² × x³ equal to?', options: ['x⁵', 'x⁶', 'x¹'], correct: 'x⁵' },
      { q: 'log 100 (base 10) equals?', options: ['1', '2', '10'], correct: '2' },
      { q: 'What is 2⁰?', options: ['0', '1', '2'], correct: '1' },
    ],
  },
  {
    title: 'Week 2: Quadratic Equations',
    uploadInstructions: 'Practice solving quadratic equations by factorization.',
    quizQuestions: [
      { q: 'What is the standard form of a quadratic equation?', options: ['ax² + bx + c = 0', 'ax + b = 0', 'a/x = b'], correct: 'ax² + bx + c = 0' },
      { q: 'How many roots does a quadratic equation generally have?', options: ['1', '2', '3'], correct: '2' },
      { q: 'What is the value of x in x² = 9?', options: ['3 or -3', '9', '81'], correct: '3 or -3' },
    ],
  },
  {
    title: 'Week 3: Simultaneous Equations',
    uploadInstructions: 'Practice solving pairs of simultaneous equations.',
    quizQuestions: [
      { q: 'Simultaneous equations involve solving how many equations together?', options: ['One', 'Two or more', 'Ten'], correct: 'Two or more' },
      { q: 'In simultaneous equations, we solve for?', options: ['Two unknown variables', 'One unknown variable', 'No variables'], correct: 'Two unknown variables' },
      { q: 'If x + y = 5 and x − y = 1, what is x?', options: ['3', '2', '5'], correct: '3' },
    ],
  },
  {
    title: 'Week 4: Mensuration — Area and Volume',
    uploadInstructions: 'Practice calculating area and volume of common shapes.',
    quizQuestions: [
      { q: 'What is the formula for the area of a rectangle?', options: ['Length × Width', 'Length + Width', '2(Length + Width)'], correct: 'Length × Width' },
      { q: 'What is the formula for the area of a circle?', options: ['πr²', '2πr', 'πd'], correct: 'πr²' },
      { q: 'What unit is volume usually measured in?', options: ['Cubic units', 'Square units', 'Linear units'], correct: 'Cubic units' },
    ],
  },
];

const waecWeeks: WeekSeed[] = [
  {
    title: 'Week 1: Sets and Venn Diagrams',
    uploadInstructions: 'Practice representing sets and solving problems using Venn diagrams.',
    quizQuestions: [
      { q: 'A set is a collection of?', options: ['Distinct objects', 'Numbers only', 'Letters only'], correct: 'Distinct objects' },
      { q: "What symbol represents 'union' of two sets?", options: ['∪', '∩', '∈'], correct: '∪' },
      { q: "What symbol represents 'intersection' of two sets?", options: ['∩', '∪', '⊂'], correct: '∩' },
    ],
  },
  {
    title: 'Week 2: Statistics — Mean, Median, Mode',
    uploadInstructions: 'Practice calculating mean, median, and mode from data sets.',
    quizQuestions: [
      { q: 'The mean is also known as the?', options: ['Average', 'Middle value', 'Most frequent value'], correct: 'Average' },
      { q: 'The median is the?', options: ['Middle value when data is ordered', 'Average of all values', 'Most frequent value'], correct: 'Middle value when data is ordered' },
      { q: 'The mode is the?', options: ['Most frequent value', 'Middle value', 'Average value'], correct: 'Most frequent value' },
    ],
  },
  {
    title: 'Week 3: Basic Trigonometry',
    uploadInstructions: 'Practice applying sine, cosine, and tangent to right-angled triangles.',
    quizQuestions: [
      { q: 'In a right triangle, which ratio is Sine?', options: ['Opposite/Hypotenuse', 'Adjacent/Hypotenuse', 'Opposite/Adjacent'], correct: 'Opposite/Hypotenuse' },
      { q: 'What is Cosine in a right triangle?', options: ['Adjacent/Hypotenuse', 'Opposite/Hypotenuse', 'Opposite/Adjacent'], correct: 'Adjacent/Hypotenuse' },
      { q: 'A right angle measures?', options: ['90 degrees', '180 degrees', '45 degrees'], correct: '90 degrees' },
    ],
  },
  {
    title: 'Week 4: Circle Theorems',
    uploadInstructions: 'Practice applying circle theorems to solve geometry problems.',
    quizQuestions: [
      { q: 'The angle at the center of a circle is ___ the angle at the circumference subtending the same arc.', options: ['Twice', 'Half', 'Equal to'], correct: 'Twice' },
      { q: 'The angle in a semicircle is?', options: ['90 degrees', '180 degrees', '45 degrees'], correct: '90 degrees' },
      { q: 'A line from the center to the edge of a circle is called the?', options: ['Radius', 'Diameter', 'Chord'], correct: 'Radius' },
    ],
  },
];

async function seed() {
  console.log(`Seeding SS3 (JAMB Preparation) — class ${JAMB_CLASS_ID}, subject ${SHARED_SUBJECT_ID}`);
  await seedClass(JAMB_CLASS_ID, jambWeeks);

  console.log(`\nSeeding SS3 (WAEC Preparation) — class ${WAEC_CLASS_ID}, subject ${SHARED_SUBJECT_ID}`);
  await seedClass(WAEC_CLASS_ID, waecWeeks);

  console.log('\nSS3 prep seeding complete — 8 topics, 32 submission resources, 8 quiz resources, 32 file_upload elements, 24 multiple_choice elements.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});