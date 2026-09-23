import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

function generateVideoThumbnail(videoPath: string, folderPath: string): Promise<string> {
  const thumbnailName = `${Date.now()}_thumbnail.jpg`;
  const thumbnailPath = path.join(folderPath, thumbnailName);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:10'],
        filename: thumbnailName,
        folder: folderPath,
        size: '320x240',
      })
      .on('end', () => resolve(thumbnailName))
      .on('error', (err: Error) => reject(err));
  });
}

export default generateVideoThumbnail;