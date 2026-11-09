// Entry point: everything else starts in app/boot.ts.
import './ui/theme.css';
import { boot } from './app/boot.ts';
import { logError } from './app/log.ts';

boot().catch((err: unknown) => {
  logError('boot failed', err);
});
