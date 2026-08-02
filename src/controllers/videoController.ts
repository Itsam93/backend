import {
  Request,
  Response,
} from "express";

import { UploadApiResponse } from "cloudinary";

import cloudinary from "../config/cloudinary.js";

import { Video } from "../models/Video.js";

const MAX_VIDEO_DURATION = 30;

export async function getRandomApprovedVideo(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const videos =
      await Video.aggregate([
        {
          $match: {
            status: "approved",
          },
        },
        {
          $sample: {
            size: 1,
          },
        },
      ]);

    res.status(200).json({
      success: true,
      data: videos[0] ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch random approved video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch video.",
    });
  }
}

export async function uploadVideo(
  req: Request,
  res: Response
): Promise<void> {
  let uploadedPublicId:
    | string
    | null = null;

  try {
    const {
      name,
      church,
      duration,
    } = req.body;

    const file = req.file;

    const trimmedName =
      typeof name === "string"
        ? name.trim()
        : "";

    if (!trimmedName) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your name.",
      });

      return;
    }

    if (trimmedName.length > 80) {
      res.status(400).json({
        success: false,
        message:
          "Name must not exceed 80 characters.",
      });

      return;
    }

    const trimmedChurch =
      typeof church === "string"
        ? church.trim()
        : "";

    if (!trimmedChurch) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your church.",
      });

      return;
    }

    if (trimmedChurch.length > 120) {
      res.status(400).json({
        success: false,
        message:
          "Church name must not exceed 120 characters.",
      });

      return;
    }

    if (!file) {
      res.status(400).json({
        success: false,
        message:
          "Please select a video.",
      });

      return;
    }

    const parsedDuration =
      Number(duration);

    if (
      !Number.isFinite(
        parsedDuration
      ) ||
      parsedDuration <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid video duration is required.",
      });

      return;
    }

    if (
      parsedDuration >
      MAX_VIDEO_DURATION
    ) {
      res.status(400).json({
        success: false,
        message:
          "Your video must be 30 seconds or less.",
      });

      return;
    }

    const uploadResult =
      await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                resource_type: "video",
                folder:
                  "birthday-celebration/videos",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
              },
              (error, result) => {
                if (error) {
                  reject(error);
                  return;
                }

                if (!result) {
                  reject(
                    new Error(
                      "Cloudinary returned no upload result."
                    )
                  );

                  return;
                }

                resolve(result);
              }
            );

          uploadStream.end(
            file.buffer
          );
        }
      );

    uploadedPublicId =
      uploadResult.public_id;

    const video =
      await Video.create({
        name: trimmedName,
        church: trimmedChurch,

        videoUrl:
          uploadResult.secure_url,

        publicId:
          uploadResult.public_id,

        fileName:
          file.originalname,

        duration:
          parsedDuration,

        status: "pending",

        submittedAt:
          new Date(),

        reviewedAt: null,
      });

    res.status(201).json({
      success: true,
      message:
        "Your video has been submitted successfully and is awaiting review.",
      data: {
        id: video._id,
        name: video.name,
        church: video.church,
        videoUrl: video.videoUrl,
        duration: video.duration,
        status: video.status,
        submittedAt:
          video.submittedAt,
      },
    });
  } catch (error) {
    console.error(
      "Video upload failed:",
      error
    );

    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(
          uploadedPublicId,
          {
            resource_type: "video",
          }
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up Cloudinary video:",
          cleanupError
        );
      }
    }

    if (
      error instanceof Error
    ) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to upload video.",
      });

      return;
    }

    res.status(500).json({
      success: false,
      message:
        "Failed to upload video.",
    });
  }
}