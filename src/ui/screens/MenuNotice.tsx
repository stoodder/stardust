// A menu's notice (D059): why a battle couldn't start (`menuNotice`, set by the router when
// `openBattle` fails safe), shown on the Shift board and the loadout screen as an alert.
import { silkText } from '../silk.ts';
import { menuNotice } from './state.ts';

export function MenuNotice() {
  const text = menuNotice.value;
  return (
    <p class="sd-menu-notice" role="alert" hidden={text === null}>
      {text === null ? '' : silkText(text)}
    </p>
  );
}
