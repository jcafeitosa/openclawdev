import "./styles.css";
import "./ui/twitter.css";
import "./ui/app.ts";
import "./ui/twitter-loader.ts";
import { initMermaidRenderer } from "./ui/markdown.ts";

// Start watching the DOM for Mermaid placeholders and render them.
initMermaidRenderer();
