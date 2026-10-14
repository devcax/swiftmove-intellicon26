/** The first word of a person's name, for greeting them ("there" when there is none). */
function firstName(name) {
  return (
    String(name ?? "")
      .trim()
      .split(/\s+/)[0] || "there"
  );
}

module.exports = { firstName };
