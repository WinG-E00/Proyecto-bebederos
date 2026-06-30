import express from "express";
import { routerAuth } from "./js/database/router/router.js"

const app = express();

app.use(express.json())
