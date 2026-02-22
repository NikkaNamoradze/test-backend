import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcrypt";
import { admins, instructions } from "./schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test_instructions";
const client = postgres(connectionString);
const db = drizzle(client);

const INSTRUCTION_DATA = [
  {
    orderIndex: 1,
    title: "Workplace Hazard Awareness",
    description: "Identifying and mitigating common workplace hazards. Learn to recognize potential dangers before they become incidents.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    orderIndex: 2,
    title: "Emergency Evacuation Procedures",
    description: "Step-by-step evacuation routes and assembly points. Know exactly what to do when the alarm sounds.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    orderIndex: 3,
    title: "Personal Protective Equipment",
    description: "Correct usage and maintenance of PPE. Proper equipment is your last line of defense — use it right.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    orderIndex: 4,
    title: "Fire Safety & Extinguisher Use",
    description: "How to operate fire extinguishers and when to evacuate. Remember PASS: Pull, Aim, Squeeze, Sweep.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    orderIndex: 5,
    title: "Manual Handling & Lifting",
    description: "Safe lifting techniques to prevent musculoskeletal injuries. Bend your knees, not your back.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  },
  {
    orderIndex: 6,
    title: "Chemical Safety & COSHH",
    description: "Safe storage, handling, and disposal of hazardous substances. Always check the SDS before use.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
  },
  {
    orderIndex: 7,
    title: "Electrical Safety Fundamentals",
    description: "Recognizing electrical hazards and safe working practices around live equipment.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  },
  {
    orderIndex: 8,
    title: "Working at Height",
    description: "Ladder safety, harness checks, and fall prevention measures. Falls remain the leading cause of workplace fatalities.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    orderIndex: 9,
    title: "First Aid Essentials",
    description: "Basic first aid response for cuts, burns, and medical emergencies. Every second counts in an emergency.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    orderIndex: 10,
    title: "Noise & Vibration Control",
    description: "Protecting yourself from occupational hearing loss and hand-arm vibration syndrome.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },
  {
    orderIndex: 11,
    title: "Lone Working Safety",
    description: "Procedures and check-ins for employees working alone. Communication and awareness are essential.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  },
  {
    orderIndex: 12,
    title: "Incident Reporting & Near Misses",
    description: "How and why to report every incident, no matter how minor. Near misses are accidents waiting to happen.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  },
];

async function seed() {
  // Create admin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const existing = await db.select().from(admins).where(eq(admins.email, "admin@test.com"));
  if (existing.length === 0) {
    await db.insert(admins).values({
      email: "admin@test.com",
      password: hashedPassword,
    });
    console.log("Admin created: admin@test.com / admin123");
  } else {
    console.log("Admin already exists: admin@test.com");
  }

  // Upsert 12 instructions (update video URLs and descriptions if already exist)
  for (const data of INSTRUCTION_DATA) {
    const existing = await db.select().from(instructions).where(eq(instructions.orderIndex, data.orderIndex));
    if (existing.length === 0) {
      await db.insert(instructions).values(data);
      console.log(`Created instruction #${data.orderIndex}: ${data.title}`);
    } else {
      await db
        .update(instructions)
        .set({ title: data.title, description: data.description, videoUrl: data.videoUrl })
        .where(eq(instructions.orderIndex, data.orderIndex));
      console.log(`Updated instruction #${data.orderIndex}: ${data.title}`);
    }
  }

  console.log("\nSeed complete.");
  await client.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
