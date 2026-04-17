import Logger from "ts-logger-node";

Logger.paths = {
    general: {
      dir: "custom-logs/",
      fileName: "custom-general",
      fileExt: ".log",
    },
    error: {
      dir: "custom-logs/",
      fileName: "custom-error",
      fileExt: ".log",
    },
  };


export default Logger
