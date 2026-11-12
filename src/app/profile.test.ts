// Character creation (T306): the intake's rules, its writes (the profile and the arrival_reason
// flag), Settings' edit, and the file note's preview.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore, createNewSave } from '../meta/index.ts';
import {
  ARRIVAL_ORDER,
  BLANK_INTAKE,
  INTAKE_PROBLEMS,
  SAMPLE_NOTE,
  cleanName,
  editProfile,
  holdNewGame,
  intakeMode,
  intakeProblems,
  nameProblem,
  needsIntake,
  previewText,
  setIntakeEnabled,
  signIntake,
  withIntake,
  withPreludeSeen,
  withProfileEdit,
} from './profile.ts';
import { activeSave, closeSession, initSaves, newGame, slotEmpty } from './save.ts';
import { worstCaseLength } from '../story/text.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  setIntakeEnabled(true);
  holdNewGame(null);
});

describe('the name rule', () => {
  it('trims and collapses spaces before it checks', () => {
    expect(cleanName('  Ada   Okafor ')).toBe('Ada Okafor');
    expect(nameProblem('  Ada  ')).toBeNull();
    expect(nameProblem("D'Arcy-Lee Jr.")).toBeNull();
  });

  it('says what is wrong, cheerfully', () => {
    expect(nameProblem('   ')).toBe(INTAKE_PROBLEMS.nameEmpty);
    expect(nameProblem('x'.repeat(17))).toBe(INTAKE_PROBLEMS.nameLong);
    expect(nameProblem('Zoë')).toBe(INTAKE_PROBLEMS.nameChars);
    expect(nameProblem('Bob & Co')).toBe(INTAKE_PROBLEMS.nameChars);
    expect(nameProblem("'-.")).toBe(INTAKE_PROBLEMS.nameBare);
    for (const m of Object.values(INTAKE_PROBLEMS)) expect(m).not.toMatch(/invalid|error|wrong/i);
  });

  it('the name and the reason must be filled; the form of address is optional (Tech.; D163)', () => {
    expect(BLANK_INTAKE).toEqual({ name: '', address: 'tech', arrival: null });
    expect(intakeProblems(BLANK_INTAKE)).toEqual({
      name: INTAKE_PROBLEMS.nameEmpty,
      arrival: INTAKE_PROBLEMS.arrival,
    });
    expect(intakeProblems({ name: 'Ada', address: 'tech', arrival: 'lettuce' })).toEqual({});
  });
});

describe('the intake writes', () => {
  it('the prelude into story.seen, once (T1001)', () => {
    const save = withPreludeSeen(createNewSave());
    expect(save.story.seen).toEqual(['a1_m01_scene_prelude']);
    expect(withPreludeSeen(save)).toBe(save);
  });

  it('the profile with the first callsign, and the arrival_reason flag', () => {
    const save = withIntake(createNewSave(), { name: 'Ada', address: 'ms' }, 'lettuce');
    expect(save.profile).toEqual({
      name: 'Ada',
      address: 'ms',
      pronouns: 'she',
      callsign: 'sprout',
    });
    expect(save.story.flags.arrival_reason).toBe('lettuce');
  });

  it('keeps a callsign already earned', () => {
    const base = createNewSave();
    base.profile = { name: 'Old', address: 'mr', pronouns: 'he', callsign: 'thorn' };
    expect(withIntake(base, { name: 'New', address: 'tech' }, 'bonus').profile?.callsign).toBe(
      'thorn',
    );
  });

  it('a new game: the slot stays empty until the form is signed', () => {
    holdNewGame(2);
    expect(intakeMode()).toEqual({ kind: 'new', slot: 2 });
    expect(slotEmpty(2)).toBe(true);
    const bad = signIntake({ name: '', address: 'mr', arrival: 'bonus' });
    expect(bad.ok).toBe(false);
    expect(slotEmpty(2)).toBe(true);
    expect(signIntake({ name: ' Kofi ', address: 'mr', arrival: 'family' })).toEqual({ ok: true });
    expect(slotEmpty(2)).toBe(false);
    expect(activeSave()?.profile).toEqual({
      name: 'Kofi',
      address: 'mr',
      pronouns: 'he',
      callsign: 'sprout',
    });
    expect(activeSave()?.story.flags.arrival_reason).toBe('family');
    // The hold is spent: the intake now edits the save in play.
    expect(intakeMode()).toEqual({ kind: 'existing' });
  });

  it('signs with the form of address untouched: Tech. (they) is filed', () => {
    holdNewGame(1);
    expect(signIntake({ ...BLANK_INTAKE, name: 'Ada', arrival: 'lettuce' })).toEqual({ ok: true });
    expect(activeSave()?.profile).toEqual({
      name: 'Ada',
      address: 'tech',
      pronouns: 'they',
      callsign: 'sprout',
    });
  });

  it('a save with no profile (a v1 save) needs the intake, and files it in place', () => {
    newGame(1);
    expect(needsIntake()).toBe(true);
    expect(signIntake({ name: 'Ada', address: 'tech', arrival: 'bonus' })).toEqual({ ok: true });
    expect(needsIntake()).toBe(false);
    expect(activeSave()?.story.flags.arrival_reason).toBe('bonus');
  });

  it('off under ?test=1 unless asked for', () => {
    newGame(1);
    setIntakeEnabled(false);
    expect(needsIntake()).toBe(false);
  });

  it('no save and no hold: nothing to fill in', () => {
    closeSession();
    expect(intakeMode()).toBeNull();
    expect(signIntake({ name: 'Ada', address: 'ms', arrival: 'bonus' }).ok).toBe(false);
  });
});

describe('Settings edits the file', () => {
  it('changes the name and form of address; the callsign and reason stay', () => {
    newGame(1, (s) => withIntake(s, { name: 'Ada', address: 'ms' }, 'lettuce'));
    expect(editProfile('  Ada  Lovelace ', 'tech')).toEqual({ ok: true });
    expect(activeSave()?.profile).toEqual({
      name: 'Ada Lovelace',
      address: 'tech',
      pronouns: 'they',
      callsign: 'sprout',
    });
    expect(activeSave()?.story.flags.arrival_reason).toBe('lettuce');
  });

  it('keeps the honorific picked, so the form shows it again (Mrs. and Ms. share a set)', () => {
    newGame(1, (s) => withIntake(s, { name: 'Ada', address: 'ms' }, 'lettuce'));
    expect(editProfile('Ada', 'mrs')).toEqual({ ok: true });
    expect(activeSave()?.profile).toMatchObject({ address: 'mrs', pronouns: 'she' });
    expect(editProfile('Ada', 'dr')).toEqual({ ok: true });
    expect(activeSave()?.profile).toMatchObject({ address: 'dr', pronouns: 'they' });
  });

  it('refuses a bad name with the form message, and needs a filed profile', () => {
    newGame(1);
    expect(editProfile('Ada', 'ms')).toEqual({
      ok: false,
      message: 'Your intake form opens when you continue this campaign.',
    });
    expect(editProfile('', 'ms')).toEqual({ ok: false, message: INTAKE_PROBLEMS.nameEmpty });
    expect(withProfileEdit(createNewSave(), { name: 'X', address: 'mr' }).profile).toBeNull();
  });
});

describe('the preview', () => {
  it('resolves the file note for each form of address', () => {
    expect(previewText(SAMPLE_NOTE, 'tech')).toBe(
      'File note: They are cleared for perimeter duty. Their helmet is one size fits most!',
    );
    expect(previewText(SAMPLE_NOTE, 'ms')).toBe(
      'File note: She is cleared for perimeter duty. Her helmet is one size fits most!',
    );
    expect(previewText(SAMPLE_NOTE, 'mr')).toBe(
      'File note: He is cleared for perimeter duty. His helmet is one size fits most!',
    );
    expect(previewText(SAMPLE_NOTE, 'mrs')).toBe(previewText(SAMPLE_NOTE, 'ms'));
    expect(previewText(SAMPLE_NOTE, 'dr')).toBe(previewText(SAMPLE_NOTE, 'tech'));
  });

  it('fits a dialogue line at worst case (style-guide.md § 5.4)', () => {
    expect(worstCaseLength(SAMPLE_NOTE)).toBeLessThanOrEqual(120);
  });

  it('offers the arrival reasons in form order', () => {
    expect(ARRIVAL_ORDER).toEqual(['bonus', 'family', 'lettuce']);
  });
});
