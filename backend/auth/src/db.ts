import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://scriptony:scriptony_secret@localhost:5432/scriptony';

export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  created_at?: Date;
}

export class Database {
  private sql: ReturnType<typeof postgres>;

  constructor() {
    this.sql = postgres(connectionString);
  }

  async createUser(user: Omit<User, 'created_at'>): Promise<void> {
    await this.sql`
      INSERT INTO auth_users (id, email, password, role)
      VALUES (${user.id}, ${user.email}, ${user.password}, ${user.role})
    `;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.sql<User[]>`
      SELECT * FROM auth_users WHERE email = ${email}
    `;
    return result[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.sql<User[]>`
      SELECT * FROM auth_users WHERE id = ${id}
    `;
    return result[0] || null;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
