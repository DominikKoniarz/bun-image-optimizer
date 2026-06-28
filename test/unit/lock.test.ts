import { describe, expect, test } from "bun:test";
import { Lock, LockStatus } from "../../src/lock";

interface Entry {
    value: string;
    expiresAt: number;
}

class FakeRedis {
    private readonly entries = new Map<string, Entry>();
    private now = 0;

    advance(ms: number) {
        this.now += ms;
    }

    async send(command: string, args: string[]): Promise<unknown> {
        this.deleteExpired();

        await Bun.sleep(0);

        switch (command) {
            case "SET":
                return this.set(args);
            case "GET":
                return this.entries.get(args[0] ?? "")?.value ?? null;
            case "EVAL":
                return this.eval(args);
            default:
                throw new Error(`Unsupported command: ${command}`);
        }
    }

    private set(args: string[]): "OK" | null {
        const [key, value, nx, px, lease] = args;

        if (
            key === undefined ||
            value === undefined ||
            nx !== "NX" ||
            px !== "PX" ||
            lease === undefined
        ) {
            throw new Error("Invalid SET args");
        }

        if (this.entries.has(key)) {
            return null;
        }

        this.entries.set(key, {
            value,
            expiresAt: this.now + Number(lease),
        });

        return "OK";
    }

    private eval(args: string[]): number {
        const [script, keyCount, key, token, lease] = args;

        if (keyCount !== "1" || key === undefined || token === undefined) {
            throw new Error("Invalid EVAL args");
        }

        const entry = this.entries.get(key);

        if (entry?.value !== token) {
            return 0;
        }

        if (script?.includes("PEXPIRE")) {
            if (lease === undefined) {
                throw new Error("Invalid extend args");
            }

            entry.expiresAt = this.now + Number(lease);
            return 1;
        }

        this.entries.delete(key);
        return 1;
    }

    private deleteExpired() {
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= this.now) {
                this.entries.delete(key);
            }
        }
    }
}

describe("Lock", () => {
    test("acquires and releases a lock", async () => {
        const redis = new FakeRedis();
        const lock = new Lock({ id: "image:1", lease: 1000, redis });

        expect(await lock.acquire()).toBe(true);
        expect(await lock.getStatus()).toBe(LockStatus.ACQUIRED);
        expect(await lock.release()).toBe(true);
        expect(await lock.getStatus()).toBe(LockStatus.FREE);
    });

    test("prevents concurrent acquisition", async () => {
        const redis = new FakeRedis();
        const first = new Lock({ id: "image:1", redis });
        const second = new Lock({
            id: "image:1",
            redis,
            retry: { attempts: 1 },
        });

        expect(await first.acquire()).toBe(true);
        expect(await second.acquire()).toBe(false);
    });

    test("does not release another owner lock", async () => {
        const redis = new FakeRedis();
        const first = new Lock({ id: "image:1", lease: 1000, redis });
        const second = new Lock({ id: "image:1", lease: 1000, redis });

        expect(await first.acquire()).toBe(true);

        redis.advance(1000);

        expect(await second.acquire()).toBe(true);
        expect(await first.release()).toBe(false);
        expect(await second.getStatus()).toBe(LockStatus.ACQUIRED);
    });

    test("extends only owner lock", async () => {
        const redis = new FakeRedis();
        const first = new Lock({ id: "image:1", lease: 1000, redis });
        const second = new Lock({ id: "image:1", lease: 1000, redis });

        expect(await first.acquire()).toBe(true);
        expect(await second.extend(1000)).toBe(false);
        expect(await first.extend(1000)).toBe(true);

        redis.advance(999);

        expect(await second.acquire({ retry: { attempts: 1 } })).toBe(false);
    });

    test("retries acquisition", async () => {
        const redis = new FakeRedis();
        const first = new Lock({ id: "image:1", redis });
        const second = new Lock({
            id: "image:1",
            redis,
            retry: { attempts: 2, delay: 5 },
        });

        expect(await first.acquire()).toBe(true);
        setTimeout(() => {
            void first.release();
        }, 1);

        expect(await second.acquire()).toBe(true);
    });
});
