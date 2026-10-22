import path from 'node:path';
import os from 'node:os';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://wbm:wbm@localhost:5432/wbm_test';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.STORAGE_LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? path.join(os.tmpdir(), `wbm-test-storage-${process.pid}`);
process.env.LLM_PROVIDER = 'mock';
process.env.LEAD_SOURCE = 'mock';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.EMAIL_PROVIDER = 'mock';
process.env.MAIL_PROVIDER = 'mock';
process.env.REGISTRAR_PROVIDER = 'mock';
process.env.HOSTING_PROVIDER = 'mock';
