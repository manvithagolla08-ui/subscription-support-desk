import express from "express";
import { readServiceStatus } from "../services/readServiceStatus.js";


const serviceStatusRouter = express.Router();

serviceStatusRouter.get("/", async (req, res) => {
  const result =
    req.query.feature === undefined
      ? await readServiceStatus()
      : await readServiceStatus({
          feature: req.query.feature
        });

  if (!result.success) {
    const statusCode =
      result.error?.code === "INVALID_FEATURE" ? 400 : 503;

    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
});

export default serviceStatusRouter;