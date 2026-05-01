import { Err, Ok, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRepository } from "./UserRepository";
import type { IUserRecord } from "./User";
import { prisma } from "../lib/prisma";

function toUserRecord(row: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash: string;
}): IUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as IUserRecord["role"],
    passwordHash: row.passwordHash,
  };
}

class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const row = await prisma.user.findUnique({ where: { email } });
      return Ok(row ? toUserRecord(row) : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to find user by email."));
    }
  }

  async findById(id: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const row = await prisma.user.findUnique({ where: { id } });
      return Ok(row ? toUserRecord(row) : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to find user by id."));
    }
  }

  async listUsers(): Promise<Result<IUserRecord[], AuthError>> {
    try {
      const rows = await prisma.user.findMany();
      return Ok(rows.map(toUserRecord));
    } catch {
      return Err(UnexpectedDependencyError("Unable to list users."));
    }
  }

  async createUser(user: IUserRecord): Promise<Result<IUserRecord, AuthError>> {
    try {
      const row = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          passwordHash: user.passwordHash,
        },
      });
      return Ok(toUserRecord(row));
    } catch {
      return Err(UnexpectedDependencyError("Unable to create user."));
    }
  }

  async deleteUser(id: string): Promise<Result<boolean, AuthError>> {
    try {
      await prisma.user.delete({ where: { id } });
      return Ok(true);
    } catch {
      return Ok(false);
    }
  }
}

export function CreatePrismaUserRepository(): IUserRepository {
  return new PrismaUserRepository();
}
