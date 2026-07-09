/** Shared sample roster + question bank used by both the emulator and real-project seed scripts. */

export const DIVISIONS: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj"],
  Chattogram: ["Chattogram", "Cox's Bazar", "Cumilla"],
  Rajshahi: ["Rajshahi", "Bogura"],
  Khulna: ["Khulna", "Jessore"],
  Sylhet: ["Sylhet", "Moulvibazar"],
  Barishal: ["Barishal", "Patuakhali"],
  Rangpur: ["Rangpur", "Dinajpur"],
  Mymensingh: ["Mymensingh", "Netrokona"],
};
const DIVISION_NAMES = Object.keys(DIVISIONS);

const FIRST_NAMES = [
  "Rafiul", "Tasnim", "Nusrat", "Farhan", "Mahin", "Sadia", "Imran", "Priya",
  "Kamal", "Anika", "Shakib", "Rumana", "Tanvir", "Jannatul", "Rakib", "Mim",
  "Sabbir", "Nazia", "Arafat", "Fahmida",
];

export const SAMPLE_STUDENTS = FIRST_NAMES.map((first, i) => {
  const division = DIVISION_NAMES[i % DIVISION_NAMES.length];
  const district = DIVISIONS[division][i % DIVISIONS[division].length];
  const studentId = `STU${10001 + i}`;
  const phone = `017${(10000000 + i).toString().padStart(8, "0")}`;
  return {
    studentId,
    name: `${first} ${["Ahmed", "Islam", "Rahman", "Khan", "Chowdhury"][i % 5]}`,
    phone,
    district,
    division,
  };
});

const GENERAL_KNOWLEDGE: Array<{
  text: string;
  options: [string, string, string, string];
  correctOption: "A" | "B" | "C" | "D";
  category: string;
}> = [
  { text: "What is the capital of Bangladesh?", options: ["Dhaka", "Chattogram", "Khulna", "Sylhet"], correctOption: "A", category: "Geography" },
  { text: "Which river is the longest in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctOption: "B", category: "Geography" },
  { text: "What is the largest planet in our solar system?", options: ["Earth", "Saturn", "Jupiter", "Neptune"], correctOption: "C", category: "Science" },
  { text: "Water is made up of hydrogen and which other element?", options: ["Oxygen", "Nitrogen", "Carbon", "Helium"], correctOption: "A", category: "Science" },
  { text: "Who wrote the national anthem of Bangladesh?", options: ["Kazi Nazrul Islam", "Rabindranath Tagore", "Jasimuddin", "Michael Madhusudan Dutt"], correctOption: "B", category: "General Knowledge" },
  { text: "In which year did Bangladesh gain independence?", options: ["1969", "1971", "1975", "1947"], correctOption: "B", category: "General Knowledge" },
  { text: "What is the chemical symbol for gold?", options: ["Ag", "Au", "Gd", "Go"], correctOption: "B", category: "Science" },
  { text: "Which is the smallest prime number?", options: ["0", "1", "2", "3"], correctOption: "C", category: "Mathematics" },
  { text: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correctOption: "C", category: "Geography" },
  { text: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], correctOption: "C", category: "Arts" },
  { text: "What is the freezing point of water in Celsius?", options: ["0°C", "32°C", "100°C", "-1°C"], correctOption: "A", category: "Science" },
  { text: "Which gas do plants absorb from the atmosphere for photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctOption: "C", category: "Science" },
  { text: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctOption: "D", category: "Geography" },
  { text: "Who is known as the Father of the Nation of Bangladesh?", options: ["Ziaur Rahman", "Sheikh Mujibur Rahman", "Tajuddin Ahmad", "H. M. Ershad"], correctOption: "B", category: "General Knowledge" },
  { text: "What is the currency of Bangladesh?", options: ["Rupee", "Taka", "Dinar", "Dollar"], correctOption: "B", category: "General Knowledge" },
  { text: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Mercury", "Jupiter"], correctOption: "B", category: "Science" },
  { text: "How many days are there in a leap year?", options: ["364", "365", "366", "367"], correctOption: "C", category: "General Knowledge" },
  { text: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], correctOption: "C", category: "Science" },
  { text: "Which organ pumps blood throughout the human body?", options: ["Lungs", "Brain", "Heart", "Liver"], correctOption: "C", category: "Science" },
  { text: "What is the national flower of Bangladesh?", options: ["Rose", "Water Lily", "Sunflower", "Lotus"], correctOption: "B", category: "General Knowledge" },
  { text: "Which language has the most native speakers worldwide?", options: ["English", "Spanish", "Mandarin Chinese", "Hindi"], correctOption: "C", category: "General Knowledge" },
  { text: "What do bees collect from flowers?", options: ["Water", "Nectar", "Sap", "Pollen only"], correctOption: "B", category: "Science" },
  { text: "Which is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], correctOption: "C", category: "Geography" },
  { text: "What is the powerhouse of the cell called?", options: ["Nucleus", "Ribosome", "Mitochondria", "Cytoplasm"], correctOption: "C", category: "Science" },
  { text: "Which sea separates Bangladesh from open ocean access?", options: ["Arabian Sea", "Bay of Bengal", "Andaman Sea", "South China Sea"], correctOption: "B", category: "Geography" },
  { text: "How many players are there in a football (soccer) team on the field?", options: ["9", "10", "11", "12"], correctOption: "C", category: "General Knowledge" },
  { text: "What is the boiling point of water at sea level in Celsius?", options: ["90°C", "100°C", "110°C", "212°C"], correctOption: "B", category: "Science" },
  { text: "Which is the largest mammal in the world?", options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correctOption: "B", category: "Science" },
  { text: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Yokohama"], correctOption: "C", category: "Geography" },
  { text: "Who developed the theory of relativity?", options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Galileo Galilei"], correctOption: "B", category: "Science" },
  { text: "Which is the smallest country in the world by area?", options: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], correctOption: "C", category: "Geography" },
  { text: "How many colors are there in a rainbow?", options: ["5", "6", "7", "8"], correctOption: "C", category: "General Knowledge" },
  { text: "What is the main language spoken in Bangladesh?", options: ["Hindi", "Urdu", "Bengali", "Assamese"], correctOption: "C", category: "General Knowledge" },
  { text: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], correctOption: "C", category: "Science" },
  { text: "What is the largest desert in the world?", options: ["Sahara", "Gobi", "Antarctic", "Arabian"], correctOption: "C", category: "Geography" },
  { text: "Which instrument is used to measure atmospheric pressure?", options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], correctOption: "B", category: "Science" },
  { text: "In which continent is the Sahara Desert located?", options: ["Asia", "Africa", "South America", "Australia"], correctOption: "B", category: "Geography" },
  { text: "What is the study of living organisms called?", options: ["Geology", "Biology", "Chemistry", "Physics"], correctOption: "B", category: "Science" },
  { text: "Which metal is liquid at room temperature?", options: ["Iron", "Mercury", "Lead", "Zinc"], correctOption: "B", category: "Science" },
  { text: "How many bones are there in the adult human body?", options: ["196", "206", "216", "226"], correctOption: "B", category: "Science" },
  { text: "What is the largest island in the world?", options: ["Madagascar", "Borneo", "Greenland", "New Guinea"], correctOption: "C", category: "Geography" },
  { text: "Which gas makes up the majority of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], correctOption: "B", category: "Science" },
  { text: "Who is credited with inventing the telephone?", options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"], correctOption: "C", category: "General Knowledge" },
  { text: "What is the national sport of Bangladesh?", options: ["Cricket", "Football", "Kabaddi", "Hockey"], correctOption: "C", category: "General Knowledge" },
  { text: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctOption: "C", category: "Science" },
  { text: "What is H2O commonly known as?", options: ["Salt", "Water", "Sugar", "Oxygen"], correctOption: "B", category: "Science" },
  { text: "Which country is known as the Land of the Rising Sun?", options: ["China", "Japan", "Thailand", "South Korea"], correctOption: "B", category: "Geography" },
  { text: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], correctOption: "C", category: "Arts" },
  { text: "What is the largest organ of the human body?", options: ["Liver", "Skin", "Heart", "Lungs"], correctOption: "B", category: "Science" },
  { text: "Which shape has three sides?", options: ["Square", "Triangle", "Pentagon", "Hexagon"], correctOption: "B", category: "Mathematics" },
];

const ARITHMETIC = Array.from({ length: 50 }, (_, i) => {
  const a = 2 + (i % 23);
  const b = 3 + ((i * 7) % 19);
  const op = ["+", "-", "×"][i % 3];
  let answer: number;
  if (op === "+") answer = a + b;
  else if (op === "-") answer = a - b;
  else answer = a * b;

  const distractors = new Set<number>([answer + 1, answer - 1, answer + (op === "×" ? b : 2)]);
  distractors.delete(answer);
  const wrongOptions = Array.from(distractors).slice(0, 3);
  while (wrongOptions.length < 3) wrongOptions.push(answer + wrongOptions.length + 2);

  const options = [answer, ...wrongOptions].map(String);
  // Shuffle deterministically and track where the correct answer landed.
  const order = [0, 1, 2, 3].sort((x, y) => ((i + x) % 4) - ((i + y) % 4));
  const shuffledOptions = order.map((idx) => options[idx]) as [string, string, string, string];
  const correctOption = ["A", "B", "C", "D"][order.indexOf(0)] as "A" | "B" | "C" | "D";

  return {
    text: `What is ${a} ${op} ${b}?`,
    options: shuffledOptions,
    correctOption,
    category: "Mathematics",
  };
});

export const SAMPLE_QUESTIONS = [...GENERAL_KNOWLEDGE, ...ARITHMETIC];
