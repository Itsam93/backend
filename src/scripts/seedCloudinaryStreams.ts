import "dotenv/config";

import mongoose from "mongoose";

import LiveStream from "../models/LiveStream.js";
import { connectDatabase } from "../config/db.js";

/**
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const MAX_STREAMS = 12;

const DEFAULT_TITLE = "24 Hours ZP Celebration";

const CLOUDINARY_API_BASE =
  "https://api.cloudinary.com/v2/video";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface CloudinaryInput {
  type?: string;
  uri?: string;
  stream_key?: string;
}

interface CloudinaryOutput {
  id?: string;
  name?: string;
  type?: string;
  uri?: string;
  public_id?: string;
  created_at?: number;
  updated_at?: number;
}

interface CloudinaryLiveStream {
  id: string;
  name?: string;
  input?: CloudinaryInput;
  status?: string;
  outputs?: CloudinaryOutput[];
  idle_timeout_sec?: number;
  max_runtime_sec?: number;
  created_at?: number;
  updated_at?: number;
}

interface CloudinaryLiveStreamsResponse {
  request_id?: string;
  data?: CloudinaryLiveStream[];
}

/**
 * ============================================================
 * ENVIRONMENT
 * ============================================================
 */

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured in environment variables.`
    );
  }

  return value;
}

/**
 * ============================================================
 * CLOUDINARY AUTH
 * ============================================================
 */

function getCloudinaryAuthorization(): string {
  const apiKey = getRequiredEnv(
    "CLOUDINARY_API_KEY"
  );

  const apiSecret = getRequiredEnv(
    "CLOUDINARY_API_SECRET"
  );

  return Buffer.from(
    `${apiKey}:${apiSecret}`
  ).toString("base64");
}


async function fetchCloudinaryStreams(): Promise<
  CloudinaryLiveStream[]
> {
  const cloudName = getRequiredEnv(
    "CLOUDINARY_CLOUD_NAME"
  );

  const authorization =
    getCloudinaryAuthorization();

  const url =
    `${CLOUDINARY_API_BASE}/${cloudName}/live_streams`;

  console.log(
    `Cloudinary endpoint: ${url}`
  );

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Authorization:
        `Basic ${authorization}`,

      Accept:
        "application/json",
    },
  });

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      [
        `Cloudinary API request failed.`,
        `HTTP Status: ${response.status}`,
        `Response: ${responseText}`,
      ].join("\n")
    );
  }

  let data:
    | CloudinaryLiveStreamsResponse
    | CloudinaryLiveStream[];

  try {
    data = JSON.parse(
      responseText
    ) as
      | CloudinaryLiveStreamsResponse
      | CloudinaryLiveStream[];
  } catch {
    throw new Error(
      [
        "Cloudinary returned invalid JSON.",
        "",
        responseText,
      ].join("\n")
    );
  }

  if (Array.isArray(data)) {
    return data;
  }

  return data.data ?? [];
}


function extractSequence(
  stream: CloudinaryLiveStream
): number | null {
  const name =
    stream.name?.trim();

  if (!name) {
    return null;
  }

  const match =
    name.match(
      /(?:stream|#)[\s_-]*(\d+)\s*$/i
    );

  if (!match) {
    return null;
  }

  const sequence =
    Number(match[1]);

  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    return null;
  }

  return sequence;
}

function getHlsOutput(
  stream: CloudinaryLiveStream
): CloudinaryOutput | null {
  const outputs =
    stream.outputs ?? [];

  return (
    outputs.find(
      (output) =>
        output.type?.toLowerCase() ===
        "hls"
    ) ?? null
  );
}


function validateCloudinaryStream(
  stream: CloudinaryLiveStream
): void {
  const missing: string[] = [];

  if (!stream.id) {
    missing.push("id");
  }

  if (!stream.name) {
    missing.push("name");
  }

  if (!stream.input) {
    missing.push("input");
  }

  if (!stream.input?.uri) {
    missing.push("input.uri");
  }

  if (!stream.input?.stream_key) {
    missing.push(
      "input.stream_key"
    );
  }

  const hlsOutput =
    getHlsOutput(stream);

  if (!hlsOutput) {
    missing.push(
      "HLS output"
    );
  }

  if (!hlsOutput?.uri) {
    missing.push(
      "HLS output.uri"
    );
  }

  if (missing.length > 0) {
    throw new Error(
      [
        `Cloudinary stream "${stream.id || "unknown"}" is incomplete.`,
        `Missing: ${missing.join(", ")}`,
      ].join("\n")
    );
  }
}


function sortCloudinaryStreams(
  streams: CloudinaryLiveStream[]
): CloudinaryLiveStream[] {
  return [...streams].sort(
    (a, b) => {
      const sequenceA =
        extractSequence(a);

      const sequenceB =
        extractSequence(b);

      if (
        sequenceA !== null &&
        sequenceB !== null
      ) {
        return (
          sequenceA -
          sequenceB
        );
      }

      if (
        sequenceA !== null
      ) {
        return -1;
      }

      if (
        sequenceB !== null
      ) {
        return 1;
      }

      return (
        (a.name ?? "").localeCompare(
          b.name ?? ""
        )
      );
    }
  );
}


function assignSequences(
  streams: CloudinaryLiveStream[]
): Map<string, number> {
  const sequenceMap =
    new Map<string, number>();

  const usedSequences =
    new Set<number>();


  for (const stream of streams) {
    const sequence =
      extractSequence(stream);

    if (
      sequence === null
    ) {
      continue;
    }

    if (
      usedSequences.has(
        sequence
      )
    ) {
      throw new Error(
        [
          `Duplicate sequence detected: ${sequence}.`,
          "",
          `Multiple Cloudinary streams appear to represent Stream ${sequence}.`,
          "",
          `Rename the streams so each stream has a unique number from 1 to 12.`,
        ].join("\n")
      );
    }

    usedSequences.add(
      sequence
    );

    sequenceMap.set(
      stream.id,
      sequence
    );
  }

  let nextSequence = 1;

  for (const stream of streams) {
    if (
      sequenceMap.has(
        stream.id
      )
    ) {
      continue;
    }

    while (
      usedSequences.has(
        nextSequence
      )
    ) {
      nextSequence += 1;
    }

    if (
      nextSequence >
      MAX_STREAMS
    ) {
      throw new Error(
        [
          `There are more than ${MAX_STREAMS} streams that need sequence numbers.`,
          `The application supports sequences 1-${MAX_STREAMS}.`,
        ].join("\n")
      );
    }

    sequenceMap.set(
      stream.id,
      nextSequence
    );

    usedSequences.add(
      nextSequence
    );

    nextSequence += 1;
  }

  return sequenceMap;
}


async function importStream(
  cloudinaryStream: CloudinaryLiveStream,
  sequence: number
): Promise<"created" | "updated"> {
  validateCloudinaryStream(
    cloudinaryStream
  );

  const input =
    cloudinaryStream.input!;

  const hlsOutput =
    getHlsOutput(
      cloudinaryStream
    )!;

  const name =
    cloudinaryStream.name!.trim();


  let existing =
    await LiveStream.findOne({
      streamId:
        cloudinaryStream.id,
    }).exec();

  if (!existing) {
    existing =
      await LiveStream.findOne({
        sequence,
      }).exec();
  }


  if (existing) {
    existing.name =
      name;

    existing.title =
      DEFAULT_TITLE;

    existing.streamId =
      cloudinaryStream.id;

    existing.streamKey =
      input.stream_key!;

    existing.rtmpUrl =
      input.uri!;

    existing.hlsUrl =
      hlsOutput.uri!;

    existing.publicId =
      hlsOutput.public_id ??
      `live_stream_${cloudinaryStream.id}_hls`;

    existing.sequence =
      sequence;

    await existing.save();

    return "updated";
  }


  await LiveStream.create({
    name,

    title:
      DEFAULT_TITLE,

    streamId:
      cloudinaryStream.id,

    streamKey:
      input.stream_key!,

    rtmpUrl:
      input.uri!,

    hlsUrl:
      hlsOutput.uri!,

    publicId:
      hlsOutput.public_id ??
      `live_stream_${cloudinaryStream.id}_hls`,

    sequence,

    status:
      "idle",

    isActive:
      false,

    startedAt:
      null,

    expiresAt:
      null,

    lastTransitionAt:
      null,

    usageCount:
      0,

    lastHealthCheckAt:
      null,

    lastError:
      null,
  });

  return "created";
}


async function seedCloudinaryStreams(): Promise<void> {
  try {
    console.log("");

    console.log(
      "=============================================="
    );

    console.log(
      " ZP CELEBRATION CLOUDINARY STREAM IMPORT"
    );

    console.log(
      "=============================================="
    );

    console.log("");


    await connectDatabase();

    console.log(
      `MongoDB database: ${mongoose.connection.name}`
    );

    console.log("");


    console.log(
      "Fetching existing Cloudinary Live Streams..."
    );

    const cloudinaryStreams =
      await fetchCloudinaryStreams();

    console.log(
      `Cloudinary returned ${cloudinaryStreams.length} stream(s).`
    );

    if (
      cloudinaryStreams.length === 0
    ) {
      console.log("");

      console.log(
        "No Cloudinary Live Streams were found."
      );

      console.log(
        "Nothing was imported."
      );

      return;
    }


    const sortedStreams =
      sortCloudinaryStreams(
        cloudinaryStreams
      );


    const sequenceMap =
      assignSequences(
        sortedStreams
      );


    console.log("");

    console.log(
      "Importing streams into MongoDB..."
    );

    console.log("");

    let createdCount = 0;
    let updatedCount = 0;

    for (
      const cloudinaryStream
      of sortedStreams
    ) {
      const sequence =
        sequenceMap.get(
          cloudinaryStream.id
        );

      if (
        sequence === undefined
      ) {
        throw new Error(
          `Could not assign a sequence to Cloudinary stream ${cloudinaryStream.id}.`
        );
      }

      const action =
        await importStream(
          cloudinaryStream,
          sequence
        );

      if (
        action === "created"
      ) {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }

      console.log(
        `${action === "created" ? "✓ Created" : "↻ Updated"} #${sequence} — ${cloudinaryStream.name}`
      );
    }

    const count =
      await LiveStream.countDocuments();

    console.log("");

    console.log(
      "=============================================="
    );

    console.log(
      " IMPORT COMPLETE"
    );

    console.log(
      "=============================================="
    );

    console.log("");

    console.log(
      `Cloudinary streams found : ${cloudinaryStreams.length}`
    );

    console.log(
      `MongoDB streams now       : ${count}`
    );

    console.log(
      `Created                   : ${createdCount}`
    );

    console.log(
      `Updated                   : ${updatedCount}`
    );


    const databaseStreams =
      await LiveStream.find()
        .sort({
          sequence: 1,
        })
        .select(
          "name streamId sequence status isActive hlsUrl publicId"
        )
        .lean()
        .exec();

    console.log("");

    console.log(
      "=============================================="
    );

    console.log(
      " MONGODB LIVE STREAM POOL"
    );

    console.log(
      "=============================================="
    );

    console.table(
      databaseStreams.map(
        (stream) => ({
          sequence:
            stream.sequence,

          name:
            stream.name,

          streamId:
            stream.streamId,

          status:
            stream.status,

          isActive:
            stream.isActive,

          hlsUrl:
            stream.hlsUrl,

          publicId:
            stream.publicId,
        })
      )
    );

    console.log("");

    console.log(
      `✓ Successfully imported ${cloudinaryStreams.length} Cloudinary stream(s).`
    );

    console.log(
      `✓ The system currently has ${count} stream(s) in MongoDB.`
    );

    if (
      count < MAX_STREAMS
    ) {
      console.log("");

      console.log(
        `ℹ ${MAX_STREAMS - count} stream slot(s) remain available.`
      );

      console.log(
        "You can create additional Cloudinary streams later and rerun this command."
      );
    }

    console.log("");
  } catch (error) {
    console.error("");

    console.error(
      "✗ Cloudinary stream import failed."
    );

    console.error("");

    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB connection closed."
    );
  }
}

void seedCloudinaryStreams();
