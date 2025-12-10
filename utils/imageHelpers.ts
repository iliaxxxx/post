/**
 * Reads a file and converts it to a Data URL
 */
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(new Error(`Failed to read file: ${error}`));
    reader.readAsDataURL(file);
  });
};

/**
 * Reads multiple files with error handling
 * Returns successful reads and logs failures
 */
export const readMultipleFiles = async (files: FileList | File[]): Promise<string[]> => {
  const fileArray = Array.from(files);
  const results = await Promise.allSettled(fileArray.map(readFileAsDataURL));

  const successfulReads: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulReads.push(result.value);
    } else {
      console.error(`Failed to read file ${fileArray[index].name}:`, result.reason);
    }
  });

  return successfulReads;
};
