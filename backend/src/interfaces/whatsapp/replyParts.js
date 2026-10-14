/** Split complete details into text messages, with the interactive controls sent once at the end. */
function splitText(text, limit = 4000) {
  const parts = [];
  let remaining = text;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n\n', limit);
    if (cut < limit / 4) cut = remaining.lastIndexOf('\n', limit);
    if (cut < limit / 4) cut = remaining.lastIndexOf(' ', limit);
    if (cut < limit / 4) cut = limit;
    // Avoid splitting a Unicode surrogate pair at a hard boundary.
    if (cut === limit && /[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut -= 1;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function planReply({ text, buttons, listRows }) {
  if ((buttons || listRows) && text.length <= 1024) return [{ body: text, buttons, listRows }];
  const parts = splitText(text).map(body => ({ body }));
  if (buttons || listRows) parts.push({ body: listRows ? 'Choose an option below to continue.' : 'Use the button below to continue.', buttons, listRows });
  return parts;
}

module.exports = { splitText, planReply };
