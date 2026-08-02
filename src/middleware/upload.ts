import multer from "multer";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const allowedMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
  "video/mpeg",
];

const storage =
  multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] =
  (_req, file, callback) => {
    if (
      !file.mimetype.startsWith(
        "video/"
      )
    ) {
      callback(
        new Error(
          "Only video files are allowed."
        )
      );

      return;
    }

    if (
      !allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      callback(
        new Error(
          "Unsupported video format."
        )
      );

      return;
    }

    callback(null, true);
  };

export const uploadVideo =
  multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
    fileFilter,
  });