// Private cloud note drafts must not be written to localStorage or another
// persistent, shared-browser store. Keep only this tab's active identity.
export const GUEST_DRAFT_SCOPE = Symbol("guest");
export const noteFields = note => ({
  title: String(note?.title || ""),
  content: String(note?.content || ""),
  subjectId: String(typeof note?.subjectId === "object" && note.subjectId
    ? note.subjectId._id || note.subjectId.id || "" : note?.subjectId || ""),
});
const sameFields = (a, b) => a.title === b.title && a.content === b.content && a.subjectId === b.subjectId;

export function createNoteDraftStore({ onDirtyChange = () => {} } = {}) {
  let activeScope = null;
  const drafts = new Map();
  const notify = () => onDirtyChange(drafts.size > 0);
  const allowed = scope => Boolean(scope) && scope === activeScope;
  const idOf = note => String(note?._id || "");
  function activate(scope) {
    if (scope === activeScope) return;
    activeScope = scope;
    drafts.clear();
    notify();
  }
  function remember(scope, note, fields, { pendingSave = false } = {}) {
    const id = idOf(note);
    if (!allowed(scope) || !id) return;
    const previous = drafts.get(id);
    const savedFields = noteFields(note);
    if (!pendingSave && sameFields(fields, savedFields)) drafts.delete(id);
    else drafts.set(id, { id, base: previous?.base || savedFields, fields: { ...fields } });
    notify();
  }
  function recover(scope, note) {
    const id = idOf(note);
    if (!allowed(scope) || !drafts.has(id)) return null;
    const draft = drafts.get(id);
    const saved = noteFields(note);
    if (sameFields(saved, draft.fields)) {
      drafts.delete(id); notify(); return null;
    }
    return { fields: { ...draft.fields }, conflict: !sameFields(saved, draft.base) };
  }
  function commit(scope, note, submitted, updated) {
    if (!allowed(scope)) return;
    const id = idOf(note);
    const draft = drafts.get(id);
    if (!draft) return;
    const saved = noteFields(updated);
    if (sameFields(draft.fields, submitted) || sameFields(draft.fields, saved)) drafts.delete(id);
    else if (sameFields(draft.base, noteFields(note))) drafts.set(id, { ...draft, base: saved });
    notify();
  }
  function remove(scope, id) {
    if (!allowed(scope)) return;
    drafts.delete(String(id));
    notify();
  }
  function latestId(scope) {
    return allowed(scope) ? [...drafts.keys()].at(-1) || "" : "";
  }
  function hasUnsaved(scope) { return allowed(scope) && drafts.size > 0; }
  function clear(scope) {
    if (!allowed(scope)) return;
    drafts.clear(); notify();
  }
  return { activate, remember, recover, commit, remove, latestId, hasUnsaved, clear };
}

const warnBeforeUnload = event => { event.preventDefault(); event.returnValue = ""; };
export const noteDrafts = createNoteDraftStore({
  onDirtyChange(dirty) {
    if (typeof window === "undefined") return;
    if (dirty) window.addEventListener("beforeunload", warnBeforeUnload);
    else window.removeEventListener("beforeunload", warnBeforeUnload);
  },
});
