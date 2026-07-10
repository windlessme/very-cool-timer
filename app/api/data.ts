import { getCloudflareContext } from '@opennextjs/cloudflare';

type TimerStatus = 'active' | 'break' | 'extended' | 'paused';

interface TimerInput {
  id?: number;
  title: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  status?: TimerStatus;
}

interface MessageInput {
  content: string;
  isVisible?: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

type TimerRow = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isActive: boolean | number;
  status?: TimerStatus;
  createdAt: string;
  updatedAt: string;
};

type MessageRow = {
  id: number;
  content: string;
  isVisible: boolean | number;
  createdAt: string;
  updatedAt: string;
};

function getD1Database() {
  try {
    const context = getCloudflareContext();
    return (context.env as CloudflareEnv & { DB?: D1DatabaseBinding }).DB;
  } catch {
    return undefined;
  }
}

async function getPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient();
}

function normalizeTimer(timer: TimerRow) {
  return {
    ...timer,
    isActive: Boolean(timer.isActive),
    status: timer.status || 'active',
  };
}

function normalizeMessage(message: MessageRow) {
  return {
    ...message,
    isVisible: Boolean(message.isVisible),
  };
}

const timerSelect = `
  id,
  title,
  startTime,
  endTime,
  isActive,
  status,
  strftime('%Y-%m-%dT%H:%M:%fZ', createdAt) as createdAt,
  strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt) as updatedAt
`;

const messageSelect = `
  id,
  content,
  isVisible,
  strftime('%Y-%m-%dT%H:%M:%fZ', createdAt) as createdAt,
  strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt) as updatedAt
`;

export async function listTimers() {
  const db = getD1Database();

  if (db) {
    const { results = [] } = await db
      .prepare(`SELECT ${timerSelect} FROM Timer ORDER BY createdAt DESC`)
      .all<TimerRow>();
    return results.map(normalizeTimer);
  }

  const prisma = await getPrisma();
  return prisma.timer.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createTimer(input: TimerInput) {
  const db = getD1Database();
  const status = input.status || 'active';

  if (db) {
    await db.batch([
      db.prepare('UPDATE Timer SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE isActive = 1'),
      db
        .prepare('INSERT INTO Timer (title, startTime, endTime, isActive, status) VALUES (?, ?, ?, ?, ?)')
        .bind(input.title, input.startTime, input.endTime, input.isActive ? 1 : 0, status),
    ]);

    const timer = await db
      .prepare(`SELECT ${timerSelect} FROM Timer WHERE id = last_insert_rowid()`)
      .first<TimerRow>();

    if (!timer) throw new Error('Timer was not created');
    return normalizeTimer(timer);
  }

  const prisma = await getPrisma();
  const [, timer] = await prisma.$transaction([
    prisma.timer.updateMany({
      where: {
        isActive: true,
      },
      data: {
        isActive: false,
      },
    }),
    prisma.timer.create({
      data: {
        title: input.title,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: input.isActive,
        status,
      },
    }),
  ]);

  return timer;
}

export async function updateTimer(input: Required<TimerInput>) {
  const db = getD1Database();
  const status = input.status || (input.isActive ? 'active' : 'paused');

  if (db) {
    const statements = [];

    if (input.isActive) {
      statements.push(
        db
          .prepare('UPDATE Timer SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE isActive = 1 AND id != ?')
          .bind(input.id),
      );
    }

    statements.push(
      db
        .prepare(
          'UPDATE Timer SET title = ?, startTime = ?, endTime = ?, isActive = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        )
        .bind(input.title, input.startTime, input.endTime, input.isActive ? 1 : 0, status, input.id),
    );

    await db.batch(statements);

    const timer = await db
      .prepare(`SELECT ${timerSelect} FROM Timer WHERE id = ?`)
      .bind(input.id)
      .first<TimerRow>();

    if (!timer) throw new Error('Timer was not found');
    return normalizeTimer(timer);
  }

  const prisma = await getPrisma();

  if (input.isActive) {
    const [, timer] = await prisma.$transaction([
      prisma.timer.updateMany({
        where: {
          id: {
            not: input.id,
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      }),
      prisma.timer.update({
        where: { id: input.id },
        data: {
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          isActive: input.isActive,
          status,
        },
      }),
    ]);

    return timer;
  }

  return prisma.timer.update({
    where: { id: input.id },
    data: {
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      isActive: input.isActive,
      status,
    },
  });
}

export async function deleteTimer(id: number) {
  const db = getD1Database();

  if (db) {
    await db.prepare('DELETE FROM Timer WHERE id = ?').bind(id).run();
    return;
  }

  const prisma = await getPrisma();
  await prisma.timer.delete({
    where: { id },
  });
}

export async function listMessages() {
  const db = getD1Database();

  if (db) {
    const { results = [] } = await db
      .prepare(`SELECT ${messageSelect} FROM Message WHERE isVisible = 1 ORDER BY createdAt DESC`)
      .all<MessageRow>();
    return results.map(normalizeMessage);
  }

  const prisma = await getPrisma();
  return prisma.message.findMany({
    where: {
      isVisible: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createMessage(input: MessageInput) {
  const db = getD1Database();

  if (db) {
    await db
      .prepare('INSERT INTO Message (content, isVisible) VALUES (?, ?)')
      .bind(input.content, input.isVisible === false ? 0 : 1)
      .run();

    const message = await db
      .prepare(`SELECT ${messageSelect} FROM Message WHERE id = last_insert_rowid()`)
      .first<MessageRow>();

    if (!message) throw new Error('Message was not created');
    return normalizeMessage(message);
  }

  const prisma = await getPrisma();
  return prisma.message.create({
    data: {
      content: input.content,
      isVisible: input.isVisible ?? true,
    },
  });
}

export async function updateMessage(id: number, input: MessageInput) {
  const db = getD1Database();
  const isVisible = input.isVisible ?? true;

  if (db) {
    await db
      .prepare('UPDATE Message SET content = ?, isVisible = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(input.content, isVisible ? 1 : 0, id)
      .run();

    const message = await db
      .prepare(`SELECT ${messageSelect} FROM Message WHERE id = ?`)
      .bind(id)
      .first<MessageRow>();

    if (!message) throw new Error('Message was not found');
    return normalizeMessage(message);
  }

  const prisma = await getPrisma();
  return prisma.message.update({
    where: { id },
    data: {
      content: input.content,
      isVisible,
    },
  });
}

export async function deleteMessage(id: number) {
  const db = getD1Database();

  if (db) {
    await db.prepare('DELETE FROM Message WHERE id = ?').bind(id).run();
    return;
  }

  const prisma = await getPrisma();
  await prisma.message.delete({
    where: { id },
  });
}
