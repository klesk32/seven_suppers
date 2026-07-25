// Render smoke test: load the built standalone HTML in jsdom and verify the
// app actually mounts. Fails the build if the page would be blank.
const VERSION = "0.1.0";
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("seven-suppers.html", "utf8");
const errors = [];
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "http://localhost/",
  pretendToBeVisual: true,
});
dom.window.addEventListener("error", (e) => errors.push(e.message));

setTimeout(() => {
  const doc = dom.window.document;
  const text = doc.body.textContent || "";
  const buttons = doc.querySelectorAll("button").length;
  if (errors.length > 0) {
    console.error("smoke test: page errors:", errors.join("; "));
    process.exit(1);
  }
  if (!text.includes("Seven Suppers") || buttons < 10) {
    console.error(`smoke test: app did not render (buttons: ${buttons})`);
    process.exit(1);
  }
  console.log(`smoke test: render ok (${buttons} buttons)`);
  process.exit(0);
}, 800);
