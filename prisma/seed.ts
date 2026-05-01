import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "./prisma/dev.db" });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DEMO_USERS = [
  {
    id: "user-admin",
    email: "admin@app.test",
    displayName: "Avery Admin",
    role: "admin",
    passwordHash:
      "52bd54710a468b70e447a45d4e6cfae3:ff273e3cdedbc54045ac368d1f1955e4f6f6e177d63df6fb72440e4045cf756a6f93d16710b2542c725755d9df4960977204f4b580ce184f6242419b659973bf",
  },
  {
    id: "user-staff",
    email: "staff@app.test",
    displayName: "Sam Staff",
    role: "staff",
    passwordHash:
      "5e12e1f3a75b4c2300e26eaaeda137a7:32dcbbe1d8785ced8009479e0705325bc5c425f8b69cd6c4abd6298aca4468d5564cdfaf9b8a02efa330a9d7d80e885842185ca29b5415f5c7e11b1e467324f7",
  },
  {
    id: "user-reader",
    email: "user@app.test",
    displayName: "Una User",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
  {
    id: "user-2",
    email: "user2@app.test",
    displayName: "User Two",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
  {
    id: "user-3",
    email: "user3@app.test",
    displayName: "User Three",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
  {
    id: "user-4",
    email: "user4@app.test",
    displayName: "User Four",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
  {
    id: "user-5",
    email: "user5@app.test",
    displayName: "User Five",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
];

async function main() {
  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: {},
    });
  }
  console.log("Seeded 7 demo users.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
