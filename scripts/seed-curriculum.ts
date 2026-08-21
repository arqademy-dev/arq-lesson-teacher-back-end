import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/config/db.js';
import { users, subjects, classes, topics, resources, interactiveElements } from '../src/db/schema.js';

// Rotates through every non-video interaction type across the 25 topics so the full set is represented.
const rotationTypes = ['multiple_choice', 'fill_blank', 'drag_and_drop', 'branching', 'image_sequencing', 'hotspot'] as const;

interface KeyTerm {
  term: string;
  definition: string;
}

interface QA {
  q: string;
  options: string[];
  correct: string;
}

interface TopicSeed {
  title: string;
  description: string;
  heading: string;
  paragraph: string;
  bullets: string[];
  keyTerms: [KeyTerm, KeyTerm];
  videoQ1: QA;
  videoQ2: QA;
  quizQ1: QA;
  quizQ2: QA;
}

interface SubjectSeed {
  title: string;
  description: string;
  topics: TopicSeed[];
}

function buildRotatedElement(type: string, keyTerms: [KeyTerm, KeyTerm], topicTitle: string) {
  switch (type) {
    case 'multiple_choice':
      return {
        interactionType: 'multiple_choice' as const,
        configSchema: { question: `What does "${keyTerms[0].term}" mean?`, options: [keyTerms[0].definition, keyTerms[1].definition, 'None of these'] },
        correctAnswers: { answer: keyTerms[0].definition },
      };
    case 'fill_blank':
      return {
        interactionType: 'fill_blank' as const,
        configSchema: {
          prompt_text: `${keyTerms[0].term} means [blank1].`,
          dropdown_options: { blank1: [keyTerms[0].definition, keyTerms[1].definition] },
        },
        correctAnswers: { blank1: keyTerms[0].definition },
      };
    case 'drag_and_drop':
      return {
        interactionType: 'drag_and_drop' as const,
        configSchema: {
          instructions: 'Match each term to its correct definition.',
          draggables: [{ id: 'd1', text: keyTerms[0].term }, { id: 'd2', text: keyTerms[1].term }],
          dropzones: [{ id: 'zone_1', label: keyTerms[0].definition }, { id: 'zone_2', label: keyTerms[1].definition }],
        },
        correctAnswers: { d1: 'zone_1', d2: 'zone_2' },
      };
    case 'branching':
      return {
        interactionType: 'branching' as const,
        configSchema: {
          scenario: `Which best describes "${keyTerms[0].term}" in the context of ${topicTitle}?`,
          choices: [
            { id: 'c1', text: keyTerms[0].definition, next: 'correct_feedback' },
            { id: 'c2', text: keyTerms[1].definition, next: 'incorrect_feedback' },
          ],
          feedback: { correct_feedback: 'Correct!', incorrect_feedback: 'Not quite — think again.' },
        },
        correctAnswers: { answer: 'c1' },
      };
    case 'image_sequencing':
      return {
        interactionType: 'image_sequencing' as const,
        configSchema: {
          instructions: `Put these ${topicTitle} terms in the order they were introduced.`,
          items: [{ id: 'item_1', text: keyTerms[0].term }, { id: 'item_2', text: keyTerms[1].term }],
        },
        correctAnswers: { order: ['item_1', 'item_2'] },
      };
    case 'hotspot':
      return {
        interactionType: 'hotspot' as const,
        configSchema: {
          backgroundImageUrl: `https://placehold.co/800x400?text=${encodeURIComponent(topicTitle)}`,
          hotspots: [
            { id: 'zone_1', x_coords: '20%', y_coords: '30%', width: '150px', height: '60px', label: keyTerms[0].term },
            { id: 'zone_2', x_coords: '55%', y_coords: '30%', width: '150px', height: '60px', label: keyTerms[1].term },
          ],
        },
        correctAnswers: { zone_1: keyTerms[0].term, zone_2: keyTerms[1].term },
      };
    default:
      throw new Error(`Unknown rotation type: ${type}`);
  }
}

const curriculum: SubjectSeed[] = [
  {
    title: 'Mathematics',
    description: 'Foundational mathematics — numbers, operations, fractions, and shapes.',
    topics: [
      {
        title: 'Counting and Numbers',
        description: 'Introduction to digits, numerals, and counting.',
        heading: 'Counting and Numbers',
        paragraph: 'Numbers help us count and measure things around us. We use numbers every day, from counting apples to telling the time.',
        bullets: ["Numbers can be small (1, 2, 3) or very large (1,000,000)", 'We count using the digits 0 to 9', "Zero (0) means 'nothing'"],
        keyTerms: [{ term: 'Digit', definition: 'A single number symbol like 0-9' }, { term: 'Numeral', definition: 'A symbol used to represent a number' }],
        videoQ1: { q: 'How many digits are used to write all numbers?', options: ['5', '10', '20'], correct: '10' },
        videoQ2: { q: 'What does the digit 0 represent?', options: ['Nothing', 'One', 'Ten'], correct: 'Nothing' },
        quizQ1: { q: 'Which of these is a single digit number?', options: ['7', '17', '107'], correct: '7' },
        quizQ2: { q: 'What is the smallest whole number?', options: ['1', '0', '-1'], correct: '0' },
      },
      {
        title: 'Addition and Subtraction',
        description: 'Basic addition and subtraction of whole numbers.',
        heading: 'Addition and Subtraction',
        paragraph: 'Addition means putting numbers together to make a bigger number. Subtraction means taking away one number from another.',
        bullets: ['The plus sign (+) means addition', 'The minus sign (−) means subtraction', '3 + 2 = 5, and 5 − 2 = 3'],
        keyTerms: [{ term: 'Sum', definition: 'The answer when you add numbers' }, { term: 'Difference', definition: 'The answer when you subtract numbers' }],
        videoQ1: { q: 'What is 4 + 3?', options: ['6', '7', '8'], correct: '7' },
        videoQ2: { q: 'What is 9 − 4?', options: ['5', '4', '13'], correct: '5' },
        quizQ1: { q: 'What symbol is used for addition?', options: ['+', '−', 'x'], correct: '+' },
        quizQ2: { q: 'What is 6 + 6?', options: ['10', '12', '16'], correct: '12' },
      },
      {
        title: 'Multiplication and Division',
        description: 'Basic multiplication and division of whole numbers.',
        heading: 'Multiplication and Division',
        paragraph: 'Multiplication is a quick way of adding the same number many times. Division is sharing a number into equal groups.',
        bullets: ['The times sign (×) means multiplication', 'The divide sign (÷) means division', '3 × 4 = 12, and 12 ÷ 4 = 3'],
        keyTerms: [{ term: 'Product', definition: 'The answer when you multiply numbers' }, { term: 'Quotient', definition: 'The answer when you divide numbers' }],
        videoQ1: { q: 'What is 5 × 2?', options: ['7', '10', '52'], correct: '10' },
        videoQ2: { q: 'What is 10 ÷ 2?', options: ['5', '8', '20'], correct: '5' },
        quizQ1: { q: 'What symbol is used for multiplication?', options: ['×', '+', '÷'], correct: '×' },
        quizQ2: { q: 'What is 3 × 3?', options: ['6', '9', '12'], correct: '9' },
      },
      {
        title: 'Fractions',
        description: 'Understanding fractions as parts of a whole.',
        heading: 'Understanding Fractions',
        paragraph: 'A fraction shows a part of a whole. For example, if you cut a cake into 4 equal pieces and take 1, you have 1/4 of the cake.',
        bullets: ['The top number is called the numerator', 'The bottom number is called the denominator', '1/2 means one out of two equal parts'],
        keyTerms: [{ term: 'Numerator', definition: 'The top number in a fraction' }, { term: 'Denominator', definition: 'The bottom number in a fraction' }],
        videoQ1: { q: 'In 1/2, what is the number 2 called?', options: ['Numerator', 'Denominator', 'Product'], correct: 'Denominator' },
        videoQ2: { q: 'What does 1/4 of a cake mean?', options: ['The whole cake', 'One of four equal parts', 'Four cakes'], correct: 'One of four equal parts' },
        quizQ1: { q: 'In 3/4, what is the numerator?', options: ['3', '4', '7'], correct: '3' },
        quizQ2: { q: 'Which fraction represents half?', options: ['1/2', '1/4', '2/2'], correct: '1/2' },
      },
      {
        title: 'Basic Shapes and Geometry',
        description: 'Introduction to common shapes and their properties.',
        heading: 'Basic Shapes and Geometry',
        paragraph: 'Shapes are all around us. Circles, squares, triangles, and rectangles are some of the basic shapes we see every day.',
        bullets: ['A triangle has 3 sides', 'A square has 4 equal sides', 'A circle has no straight sides'],
        keyTerms: [{ term: 'Triangle', definition: 'A shape with 3 sides' }, { term: 'Square', definition: 'A shape with 4 equal sides' }],
        videoQ1: { q: 'How many sides does a triangle have?', options: ['2', '3', '4'], correct: '3' },
        videoQ2: { q: 'How many sides does a square have?', options: ['3', '4', '5'], correct: '4' },
        quizQ1: { q: 'Which shape has no straight sides?', options: ['Square', 'Circle', 'Triangle'], correct: 'Circle' },
        quizQ2: { q: 'A shape with 4 equal sides is called a?', options: ['Triangle', 'Square', 'Circle'], correct: 'Square' },
      },
    ],
  },
  {
    title: 'Physics',
    description: 'Foundational physics — matter, energy, forces, and simple machines.',
    topics: [
      {
        title: 'What is Physics',
        description: 'Introduction to the study of matter and energy.',
        heading: 'What is Physics?',
        paragraph: 'Physics is the study of matter, energy, and how they interact. It helps us understand things like motion, light, and electricity.',
        bullets: ['Physics explains how things move', 'Physics explains energy like heat and light', 'Physics is used in machines and technology'],
        keyTerms: [{ term: 'Matter', definition: 'Anything that has mass and takes up space' }, { term: 'Energy', definition: 'The ability to do work' }],
        videoQ1: { q: 'What does physics study?', options: ['Matter and energy', 'Only plants', 'Only numbers'], correct: 'Matter and energy' },
        videoQ2: { q: 'Which of these is a form of energy?', options: ['Light', 'Chair', 'Book'], correct: 'Light' },
        quizQ1: { q: 'Physics is the study of?', options: ['Matter and energy', 'Cooking', 'History'], correct: 'Matter and energy' },
        quizQ2: { q: 'Anything that has mass and takes up space is called?', options: ['Energy', 'Matter', 'Light'], correct: 'Matter' },
      },
      {
        title: 'States of Matter',
        description: 'Solid, liquid, and gas states of matter.',
        heading: 'States of Matter',
        paragraph: 'Matter can exist in three common states: solid, liquid, and gas. Each state has its own properties.',
        bullets: ['Solids have a fixed shape (like ice)', 'Liquids take the shape of their container (like water)', 'Gases spread out to fill any space (like air)'],
        keyTerms: [{ term: 'Solid', definition: 'A state of matter with a fixed shape' }, { term: 'Liquid', definition: 'A state of matter that takes the shape of its container' }],
        videoQ1: { q: 'Which state of matter has a fixed shape?', options: ['Solid', 'Liquid', 'Gas'], correct: 'Solid' },
        videoQ2: { q: 'Which state of matter spreads out to fill any space?', options: ['Solid', 'Liquid', 'Gas'], correct: 'Gas' },
        quizQ1: { q: 'Ice is an example of which state of matter?', options: ['Solid', 'Liquid', 'Gas'], correct: 'Solid' },
        quizQ2: { q: 'Water takes the shape of its container. What state is this?', options: ['Solid', 'Liquid', 'Gas'], correct: 'Liquid' },
      },
      {
        title: 'Forces and Motion',
        description: 'Understanding pushes, pulls, and gravity.',
        heading: 'Forces and Motion',
        paragraph: 'A force is a push or pull that can make an object move, stop, or change direction. Motion means an object is changing position.',
        bullets: ['Pushing a door is a force', 'Gravity is a force that pulls things down', 'An object at rest stays still unless a force acts on it'],
        keyTerms: [{ term: 'Force', definition: 'A push or a pull' }, { term: 'Gravity', definition: 'A force that pulls objects toward the Earth' }],
        videoQ1: { q: 'What is a force?', options: ['A push or pull', 'A color', 'A sound'], correct: 'A push or pull' },
        videoQ2: { q: 'What force pulls objects toward the Earth?', options: ['Gravity', 'Friction', 'Light'], correct: 'Gravity' },
        quizQ1: { q: 'Which of these is an example of a force?', options: ['Pushing a door', 'Singing a song', 'Reading a book'], correct: 'Pushing a door' },
        quizQ2: { q: 'What pulls a dropped ball to the ground?', options: ['Gravity', 'Wind', 'Sound'], correct: 'Gravity' },
      },
      {
        title: 'Simple Machines',
        description: 'Levers, wheels, and pulleys that make work easier.',
        heading: 'Simple Machines',
        paragraph: 'Simple machines make work easier. They include levers, wheels, and pulleys, which help us lift or move things with less effort.',
        bullets: ['A lever helps lift heavy objects', 'A wheel helps things move easily', 'A pulley helps lift things using a rope and wheel'],
        keyTerms: [{ term: 'Lever', definition: 'A simple machine that helps lift heavy objects' }, { term: 'Wheel', definition: 'A simple machine that helps things move easily' }],
        videoQ1: { q: 'What does a lever help you do?', options: ['Lift heavy objects', 'Cook food', 'Write letters'], correct: 'Lift heavy objects' },
        videoQ2: { q: 'What is a wheel used for?', options: ['Helping things move easily', 'Making noise', 'Cooling water'], correct: 'Helping things move easily' },
        quizQ1: { q: 'Which is a simple machine?', options: ['Lever', 'Television', 'Phone'], correct: 'Lever' },
        quizQ2: { q: 'A pulley uses a rope and a?', options: ['Wheel', 'Stone', 'Paper'], correct: 'Wheel' },
      },
      {
        title: 'Light and Sound',
        description: 'How light and sound travel and what they let us do.',
        heading: 'Light and Sound',
        paragraph: 'Light lets us see things, and sound lets us hear things. Both light and sound travel in waves.',
        bullets: ['Light travels faster than sound', 'Sound needs air or another material to travel', 'Shadows form when light is blocked'],
        keyTerms: [{ term: 'Light', definition: 'A form of energy that lets us see' }, { term: 'Sound', definition: 'A form of energy that lets us hear' }],
        videoQ1: { q: 'Which travels faster, light or sound?', options: ['Light', 'Sound', 'They are the same'], correct: 'Light' },
        videoQ2: { q: 'What forms when light is blocked?', options: ['A shadow', 'A sound', 'A rainbow'], correct: 'A shadow' },
        quizQ1: { q: 'What do we use to see things?', options: ['Light', 'Sound', 'Air'], correct: 'Light' },
        quizQ2: { q: 'What does sound need to travel through?', options: ['Air', 'Nothing', 'Only water'], correct: 'Air' },
      },
    ],
  },
  {
    title: 'Chemistry',
    description: 'Foundational chemistry — substances, atoms, mixtures, and reactions.',
    topics: [
      {
        title: 'What is Chemistry',
        description: 'Introduction to substances and reactions.',
        heading: 'What is Chemistry?',
        paragraph: 'Chemistry is the study of what things are made of and how they change. It looks at substances and the reactions between them.',
        bullets: ['Chemistry studies substances', 'Chemistry explains how things mix or react', 'Cooking is an example of chemistry in daily life'],
        keyTerms: [{ term: 'Substance', definition: 'A particular kind of matter with uniform properties' }, { term: 'Reaction', definition: 'A change where substances combine or break apart' }],
        videoQ1: { q: 'What does chemistry study?', options: ['Substances and their changes', 'Only animals', 'Only stars'], correct: 'Substances and their changes' },
        videoQ2: { q: 'Which activity is an example of chemistry?', options: ['Cooking', 'Running', 'Singing'], correct: 'Cooking' },
        quizQ1: { q: 'Chemistry is the study of?', options: ['Substances and reactions', 'Only music', 'Only sports'], correct: 'Substances and reactions' },
        quizQ2: { q: 'A change where substances combine is called a?', options: ['Reaction', 'Song', 'Shape'], correct: 'Reaction' },
      },
      {
        title: 'Atoms and Elements',
        description: 'The smallest building blocks of matter.',
        heading: 'Atoms and Elements',
        paragraph: 'Everything around us is made of tiny particles called atoms. An element is a substance made of only one type of atom.',
        bullets: ['Atoms are the building blocks of matter', 'Oxygen and gold are examples of elements', 'Atoms are too small to see with our eyes'],
        keyTerms: [{ term: 'Atom', definition: 'The smallest building block of matter' }, { term: 'Element', definition: 'A substance made of only one type of atom' }],
        videoQ1: { q: 'What is the smallest building block of matter?', options: ['Atom', 'Rock', 'Cell'], correct: 'Atom' },
        videoQ2: { q: 'Which of these is an element?', options: ['Oxygen', 'Salt water', 'Air'], correct: 'Oxygen' },
        quizQ1: { q: 'An element is made of only one type of?', options: ['Atom', 'Rock', 'Plant'], correct: 'Atom' },
        quizQ2: { q: 'Can we see atoms with our eyes?', options: ['No', 'Yes', 'Sometimes'], correct: 'No' },
      },
      {
        title: 'Mixtures and Solutions',
        description: 'Combining substances without a chemical reaction.',
        heading: 'Mixtures and Solutions',
        paragraph: 'A mixture is made when two or more substances are combined without a chemical reaction. A solution is a special mixture where one substance dissolves into another.',
        bullets: ['Sand and water is a mixture', 'Salt dissolving in water makes a solution', 'Mixtures can usually be separated again'],
        keyTerms: [{ term: 'Mixture', definition: 'Two or more substances combined without a chemical reaction' }, { term: 'Solution', definition: 'A mixture where one substance dissolves into another' }],
        videoQ1: { q: 'What happens when salt dissolves in water?', options: ['It forms a solution', 'It disappears forever', 'It becomes a rock'], correct: 'It forms a solution' },
        videoQ2: { q: 'What is a mixture of sand and water called?', options: ['A mixture', 'An element', 'An atom'], correct: 'A mixture' },
        quizQ1: { q: 'Salt dissolving in water is an example of a?', options: ['Solution', 'Rock', 'Gas'], correct: 'Solution' },
        quizQ2: { q: 'Can mixtures usually be separated again?', options: ['Yes', 'No', 'Never'], correct: 'Yes' },
      },
      {
        title: 'Acids and Bases',
        description: 'Properties of acidic and basic substances.',
        heading: 'Acids and Bases',
        paragraph: 'Acids and bases are two types of chemicals with different properties. Lemon juice is an acid, while soap is a base.',
        bullets: ['Acids often taste sour', 'Bases often feel slippery', 'We can test acids and bases using litmus paper'],
        keyTerms: [{ term: 'Acid', definition: 'A substance that often tastes sour, like lemon juice' }, { term: 'Base', definition: 'A substance that often feels slippery, like soap' }],
        videoQ1: { q: 'Which of these is an acid?', options: ['Lemon juice', 'Soap', 'Water'], correct: 'Lemon juice' },
        videoQ2: { q: 'What can we use to test if something is an acid or base?', options: ['Litmus paper', 'A ruler', 'A clock'], correct: 'Litmus paper' },
        quizQ1: { q: 'Acids often taste?', options: ['Sour', 'Sweet', 'Salty'], correct: 'Sour' },
        quizQ2: { q: 'Soap is an example of a?', options: ['Base', 'Acid', 'Metal'], correct: 'Base' },
      },
      {
        title: 'Chemical Reactions',
        description: 'How substances change into new substances.',
        heading: 'Chemical Reactions',
        paragraph: 'A chemical reaction happens when substances change into new substances. Burning wood and rusting iron are examples of chemical reactions.',
        bullets: ['Chemical reactions form new substances', 'Burning is a chemical reaction', 'Rust forms when iron reacts with oxygen'],
        keyTerms: [{ term: 'Chemical reaction', definition: 'A process where substances change into new substances' }, { term: 'Rust', definition: 'A substance formed when iron reacts with oxygen' }],
        videoQ1: { q: 'What is formed when iron reacts with oxygen?', options: ['Rust', 'Gold', 'Water'], correct: 'Rust' },
        videoQ2: { q: 'Is burning wood a chemical reaction?', options: ['Yes', 'No', 'Sometimes'], correct: 'Yes' },
        quizQ1: { q: 'A chemical reaction forms?', options: ['New substances', 'Nothing', 'Only heat'], correct: 'New substances' },
        quizQ2: { q: 'Rust forms when iron reacts with?', options: ['Oxygen', 'Water only', 'Salt'], correct: 'Oxygen' },
      },
    ],
  },
  {
    title: 'Biology',
    description: 'Foundational biology — cells, plants, the human body, and animals.',
    topics: [
      {
        title: 'What is Biology',
        description: 'Introduction to the study of living things.',
        heading: 'What is Biology?',
        paragraph: 'Biology is the study of living things, including plants, animals, and humans. It helps us understand how living things grow and survive.',
        bullets: ['Biology studies plants and animals', 'All living things need food, water, and air', 'Biology helps us understand our own bodies'],
        keyTerms: [{ term: 'Living thing', definition: 'Something that can grow, reproduce, and respond to its environment' }, { term: 'Biology', definition: 'The study of living things' }],
        videoQ1: { q: 'What does biology study?', options: ['Living things', 'Rocks', 'Stars'], correct: 'Living things' },
        videoQ2: { q: 'What do all living things need?', options: ['Food, water, and air', 'Only sunlight', 'Only sound'], correct: 'Food, water, and air' },
        quizQ1: { q: 'Biology is the study of?', options: ['Living things', 'Machines', 'Numbers'], correct: 'Living things' },
        quizQ2: { q: 'Which of these is a living thing?', options: ['A tree', 'A rock', 'A chair'], correct: 'A tree' },
      },
      {
        title: 'Cells - The Building Blocks of Life',
        description: 'The smallest units of life.',
        heading: 'Cells — The Building Blocks of Life',
        paragraph: 'Cells are the smallest units of life. All living things are made of one or more cells.',
        bullets: ['Cells are too small to see without a microscope', 'Some living things have only one cell', 'Humans have trillions of cells'],
        keyTerms: [{ term: 'Cell', definition: 'The smallest unit of life' }, { term: 'Microscope', definition: 'A tool used to see very small things' }],
        videoQ1: { q: 'What is the smallest unit of life?', options: ['Cell', 'Atom', 'Organ'], correct: 'Cell' },
        videoQ2: { q: 'What tool do we use to see cells?', options: ['Microscope', 'Telescope', 'Ruler'], correct: 'Microscope' },
        quizQ1: { q: 'All living things are made of?', options: ['Cells', 'Rocks', 'Metal'], correct: 'Cells' },
        quizQ2: { q: 'Can we see most cells without a microscope?', options: ['No', 'Yes', 'Sometimes'], correct: 'No' },
      },
      {
        title: 'Plants and Photosynthesis',
        description: 'How plants make their own food.',
        heading: 'Plants and Photosynthesis',
        paragraph: 'Plants make their own food using sunlight, water, and air in a process called photosynthesis.',
        bullets: ['Plants need sunlight to make food', 'Photosynthesis happens in the leaves', 'Plants release oxygen during photosynthesis'],
        keyTerms: [{ term: 'Photosynthesis', definition: 'The process plants use to make food from sunlight' }, { term: 'Leaf', definition: 'The part of the plant where photosynthesis mostly happens' }],
        videoQ1: { q: 'What do plants use to make their own food?', options: ['Sunlight, water, and air', 'Only soil', 'Only rocks'], correct: 'Sunlight, water, and air' },
        videoQ2: { q: 'What gas do plants release during photosynthesis?', options: ['Oxygen', 'Smoke', 'Steam'], correct: 'Oxygen' },
        quizQ1: { q: 'The process plants use to make food is called?', options: ['Photosynthesis', 'Digestion', 'Respiration'], correct: 'Photosynthesis' },
        quizQ2: { q: 'Where does photosynthesis mostly happen in a plant?', options: ['Leaves', 'Roots', 'Stem'], correct: 'Leaves' },
      },
      {
        title: 'The Human Body Systems',
        description: 'How different body systems work together.',
        heading: 'The Human Body Systems',
        paragraph: 'Our body is made up of different systems that work together, like the digestive system and the skeletal system.',
        bullets: ['The skeletal system gives our body support', 'The digestive system breaks down food', 'The heart is part of the circulatory system'],
        keyTerms: [{ term: 'Skeletal system', definition: 'The system of bones that supports the body' }, { term: 'Digestive system', definition: 'The system that breaks down food' }],
        videoQ1: { q: 'What does the skeletal system do?', options: ['Supports the body', 'Digests food', 'Pumps blood'], correct: 'Supports the body' },
        videoQ2: { q: 'What does the digestive system do?', options: ['Breaks down food', 'Supports the body', 'Sees light'], correct: 'Breaks down food' },
        quizQ1: { q: 'Which system supports the body with bones?', options: ['Skeletal system', 'Digestive system', 'Nervous system'], correct: 'Skeletal system' },
        quizQ2: { q: 'The heart is part of which system?', options: ['Circulatory system', 'Skeletal system', 'Digestive system'], correct: 'Circulatory system' },
      },
      {
        title: 'Animal Classification',
        description: 'Grouping animals by their features.',
        heading: 'Animal Classification',
        paragraph: 'Animals can be grouped based on their features. Two large groups are vertebrates (animals with a backbone) and invertebrates (animals without one).',
        bullets: ['Fish, birds, and mammals are vertebrates', 'Insects and worms are invertebrates', 'Classification helps us study animals easily'],
        keyTerms: [{ term: 'Vertebrate', definition: 'An animal with a backbone' }, { term: 'Invertebrate', definition: 'An animal without a backbone' }],
        videoQ1: { q: 'What is a vertebrate?', options: ['An animal with a backbone', 'An animal with wings', 'An animal in water'], correct: 'An animal with a backbone' },
        videoQ2: { q: 'Which of these is an invertebrate?', options: ['An insect', 'A bird', 'A fish'], correct: 'An insect' },
        quizQ1: { q: 'Animals with a backbone are called?', options: ['Vertebrates', 'Invertebrates', 'Plants'], correct: 'Vertebrates' },
        quizQ2: { q: 'Which of these is a vertebrate?', options: ['A fish', 'An insect', 'A worm'], correct: 'A fish' },
      },
    ],
  },
  {
    title: 'Government',
    description: 'Foundational civics — how government works in Nigeria.',
    topics: [
      {
        title: 'What is Government',
        description: 'Introduction to government and citizenship.',
        heading: 'What is Government?',
        paragraph: 'Government is the group of people and institutions that make and enforce rules for a country. It helps keep order and provide services to citizens.',
        bullets: ['Government makes laws for the country', 'Government provides services like schools and roads', "Nigeria's government is a democracy"],
        keyTerms: [{ term: 'Government', definition: 'The group that makes and enforces rules for a country' }, { term: 'Citizen', definition: 'A person who is a legal member of a country' }],
        videoQ1: { q: 'What does government do?', options: ['Makes and enforces rules', 'Only sells food', 'Only builds houses'], correct: 'Makes and enforces rules' },
        videoQ2: { q: 'What type of government does Nigeria have?', options: ['A democracy', 'A monarchy', 'No government'], correct: 'A democracy' },
        quizQ1: { q: 'Government makes and enforces?', options: ['Laws', 'Songs', 'Games'], correct: 'Laws' },
        quizQ2: { q: 'A person who is a legal member of a country is called a?', options: ['Citizen', 'Visitor', 'Tourist'], correct: 'Citizen' },
      },
      {
        title: 'Arms of Government',
        description: 'The Executive, Legislature, and Judiciary.',
        heading: 'Arms of Government',
        paragraph: 'Government has three main arms: the Executive, the Legislature, and the Judiciary. Each arm has its own role.',
        bullets: ['The Executive carries out laws (led by the President)', 'The Legislature makes laws (the National Assembly)', 'The Judiciary interprets laws (the courts)'],
        keyTerms: [{ term: 'Executive', definition: 'The arm of government that carries out laws' }, { term: 'Legislature', definition: 'The arm of government that makes laws' }],
        videoQ1: { q: 'Which arm of government makes laws?', options: ['Legislature', 'Executive', 'Judiciary'], correct: 'Legislature' },
        videoQ2: { q: 'Who leads the Executive arm in Nigeria?', options: ['The President', 'A judge', 'A senator'], correct: 'The President' },
        quizQ1: { q: 'Which arm of government interprets laws?', options: ['Judiciary', 'Executive', 'Legislature'], correct: 'Judiciary' },
        quizQ2: { q: 'How many main arms of government are there?', options: ['3', '5', '1'], correct: '3' },
      },
      {
        title: 'Levels of Government in Nigeria',
        description: 'Federal, State, and Local Government.',
        heading: 'Levels of Government in Nigeria',
        paragraph: 'Nigeria has three levels of government: Federal, State, and Local Government. Each level manages different responsibilities.',
        bullets: ['The Federal Government manages the whole country', 'State Governments manage individual states', 'Local Governments manage smaller communities'],
        keyTerms: [{ term: 'Federal Government', definition: 'The government that manages the whole country' }, { term: 'Local Government', definition: 'The government that manages smaller communities' }],
        videoQ1: { q: 'How many levels of government does Nigeria have?', options: ['3', '2', '5'], correct: '3' },
        videoQ2: { q: 'Which level of government manages the whole country?', options: ['Federal Government', 'Local Government', 'State Government'], correct: 'Federal Government' },
        quizQ1: { q: 'Which level of government manages smaller communities?', options: ['Local Government', 'Federal Government', 'None'], correct: 'Local Government' },
        quizQ2: { q: 'State Governments manage?', options: ['Individual states', 'The whole world', 'Only villages'], correct: 'Individual states' },
      },
      {
        title: 'Citizenship and Civic Duties',
        description: 'Responsibilities every citizen shares.',
        heading: 'Citizenship and Civic Duties',
        paragraph: 'Being a good citizen means following laws and helping the community. Civic duties include voting, paying taxes, and obeying rules.',
        bullets: ['Voting is an important civic duty', 'Paying taxes helps fund public services', 'Obeying laws keeps the community safe'],
        keyTerms: [{ term: 'Civic duty', definition: 'A responsibility every citizen has toward their country' }, { term: 'Voting', definition: 'Choosing leaders through an election' }],
        videoQ1: { q: 'What is voting?', options: ['Choosing leaders through an election', 'Paying rent', 'Playing a game'], correct: 'Choosing leaders through an election' },
        videoQ2: { q: 'What helps fund public services?', options: ['Paying taxes', 'Skipping school', 'Ignoring laws'], correct: 'Paying taxes' },
        quizQ1: { q: 'Which of these is a civic duty?', options: ['Voting', 'Sleeping', 'Watching TV'], correct: 'Voting' },
        quizQ2: { q: 'Obeying laws helps keep the community?', options: ['Safe', 'Noisy', 'Confused'], correct: 'Safe' },
      },
      {
        title: 'Democracy and Elections',
        description: 'How citizens choose their leaders.',
        heading: 'Democracy and Elections',
        paragraph: 'Democracy is a system where citizens choose their leaders through elections. Nigeria holds elections to choose the President, governors, and other leaders.',
        bullets: ['In a democracy, citizens vote for leaders', 'Elections are usually held every few years', "Every citizen's vote counts"],
        keyTerms: [{ term: 'Democracy', definition: 'A system where citizens choose their leaders' }, { term: 'Election', definition: 'A process where people vote to choose leaders' }],
        videoQ1: { q: 'What is democracy?', options: ['A system where citizens choose leaders', 'A type of food', 'A kind of animal'], correct: 'A system where citizens choose leaders' },
        videoQ2: { q: 'How do citizens choose their leaders in a democracy?', options: ['Through elections', 'By guessing', 'By fighting'], correct: 'Through elections' },
        quizQ1: { q: 'What is an election?', options: ['A process to choose leaders by voting', 'A type of dance', 'A school subject'], correct: 'A process to choose leaders by voting' },
        quizQ2: { q: 'In a democracy, who chooses the leaders?', options: ['Citizens', 'Only the President', 'No one'], correct: 'Citizens' },
      },
    ],
  },
];

async function seed() {
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  if (!admin) {
    throw new Error('No admin user found — run scripts/seed-admin.ts first.');
  }

  // One shared class, reused across every subject below — this is the whole point of the
  // subject/class decoupling: "Basic Level" only needs to exist once, and each subject's
  // topics attach to it via their own subjectId rather than the class being subject-specific.
  const [sharedClass] = await db
    .insert(classes)
    .values({ title: 'Basic Level', term: 'Term 1', isActive: true })
    .returning();

  let rotationIndex = 0;

  for (const subj of curriculum) {
    const [subjectRow] = await db
      .insert(subjects)
      .values({ title: subj.title, description: subj.description, createdByAdminId: admin.id })
      .returning();

    for (let i = 0; i < subj.topics.length; i++) {
      const t = subj.topics[i];

      const [topicRow] = await db
        .insert(topics)
        .values({
          subjectId: subjectRow.id,
          classId: sharedClass.id,
          title: t.title,
          description: t.description,
          sortOrder: i + 1,
          expectedDurationDays: 2,
        })
        .returning();

      // Day 1 — Article, with one rotated interactive element attached
      const [articleRow] = await db
        .insert(resources)
        .values({
          topicId: topicRow.id,
          title: `${t.title} — Overview`,
          resourceType: 'article',
          urlOrPath: '',
          dayNumber: 1,
          sortOrder: 1,
          contentBody: [
            { type: 'heading', level: 1, text: t.heading },
            { type: 'paragraph', text: t.paragraph },
            { type: 'bullet_list', items: t.bullets },
          ],
        })
        .returning();

      const rotatedType = rotationTypes[rotationIndex % rotationTypes.length];
      rotationIndex++;
      const rotatedElement = buildRotatedElement(rotatedType, t.keyTerms, t.title);
      await db.insert(interactiveElements).values({
        resourceId: articleRow.id,
        interactionType: rotatedElement.interactionType,
        pauseOnTrigger: true,
        configSchema: rotatedElement.configSchema,
        correctAnswers: rotatedElement.correctAnswers,
      });

      // Day 2 — Video, with two pause-and-continue interactive_video elements
      const [videoRow] = await db
        .insert(resources)
        .values({
          topicId: topicRow.id,
          title: `${t.title} — Video Lesson`,
          resourceType: 'video',
          urlOrPath: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // placeholder — swap for real content anytime
          dayNumber: 2,
          sortOrder: 1,
        })
        .returning();

      await db.insert(interactiveElements).values([
        {
          resourceId: videoRow.id,
          interactionType: 'interactive_video',
          videoTimestampSeconds: 5,
          pauseOnTrigger: true,
          configSchema: { prompt_text: t.videoQ1.q, options: t.videoQ1.options },
          correctAnswers: { answer: t.videoQ1.correct },
        },
        {
          resourceId: videoRow.id,
          interactionType: 'interactive_video',
          videoTimestampSeconds: 15,
          pauseOnTrigger: true,
          configSchema: { prompt_text: t.videoQ2.q, options: t.videoQ2.options },
          correctAnswers: { answer: t.videoQ2.correct },
        },
      ]);

      // End-of-topic quiz
      const [quizRow] = await db
        .insert(resources)
        .values({ topicId: topicRow.id, title: `${t.title} — Quiz`, resourceType: 'quiz', urlOrPath: '', dayNumber: 2, sortOrder: 2 })
        .returning();

      await db.insert(interactiveElements).values([
        {
          resourceId: quizRow.id,
          interactionType: 'multiple_choice',
          configSchema: { question: t.quizQ1.q, options: t.quizQ1.options },
          correctAnswers: { answer: t.quizQ1.correct },
        },
        {
          resourceId: quizRow.id,
          interactionType: 'multiple_choice',
          configSchema: { question: t.quizQ2.q, options: t.quizQ2.options },
          correctAnswers: { answer: t.quizQ2.correct },
        },
      ]);

      console.log(`Seeded: ${subj.title} > ${t.title}`);
    }
  }

  console.log('\nCurriculum seeding complete — 5 subjects, 25 topics, 125 resources, 125 interactive elements.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});