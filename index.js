const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
// Start the server
const port = process.env.PORT || 3000;
const app = express();

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) =>
    {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) =>
    {
        const fileName = `${uuidv4()}-${file.originalname}`;
        cb(null, fileName);
    }
});

// Initialize multer upload
const upload = multer({ storage });

// ...

app.post('/upload', upload.single('file'), (req, res) =>
{
    const { file } = req;
    const { travelId, bicycleId } = req.body;

    // Save metadata to a file
    const metadataFileName = `${file.filename}.json`;
    const metadataFilePath = `uploads/${metadataFileName}`;

    const metadataObject = {
        originalName: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        size: file.size,
        metadata: {
            travelId,
            bicycleId
        }
    };

    // Check for existing images with the same travelId and bicycleId
    fs.readdir('uploads/', (err, files) =>
    {
        if (err)
        {
            res.status(500).json({ error: 'Failed to read the uploads directory.' });
            return;
        }

        const matchingFiles = files.filter((existingFile) =>
        {
            const existingMetadataFilePath = `uploads/${existingFile}.json`;
            try
            {
                const metadata = fs.readFileSync(existingMetadataFilePath, 'utf8');
                const metadataObject = JSON.parse(metadata);

                // Check if the metadata matches the search criteria
                if (
                    metadataObject.metadata.travelId === travelId &&
                    metadataObject.metadata.bicycleId === bicycleId
                )
                {
                    return true;
                }
            } catch (error)
            {
                // Ignore any errors when reading or parsing metadata files
            }
            return false;
        });

        // Delete existing files with the same travelId and bicycleId
        matchingFiles.forEach((existingFile) =>
        {
            const existingImagePath = `uploads/${existingFile}`;
            const existingMetadataPath = `uploads/${existingFile}.json`;

            fs.unlink(existingImagePath, (err) =>
            {
                if (err)
                {
                    console.error(`Failed to delete image ${existingFile}.`);
                }
            });

            fs.unlink(existingMetadataPath, (err) =>
            {
                if (err)
                {
                    console.error(`Failed to delete metadata ${existingFile}.json.`);
                }
            });
        });

        // Write the new metadata file
        fs.writeFileSync(metadataFilePath, JSON.stringify(metadataObject));

        res.status(200).json({ message: 'File uploaded successfully.' });
    });
});


// GET endpoint for retrieving picture based on travelId and bicycleId
app.post('/picture', (req, res) =>
{
    const { travelId, bicycleId } = req.query;
    console.log(travelId);
    // Read the uploads directory
    fs.readdir('uploads/', (err, files) =>
    {
        if (err)
        {
            res.status(500).json({ error: 'Failed to read the uploads directory.' });
            return;
        }

        // Find the matching file based on metadata
        const matchingFile = files.find((file) =>
        {
            const metadataFilePath = `uploads/${file}.json`;
            try
            {
                const metadata = fs.readFileSync(metadataFilePath, 'utf8');
                const metadataObject = JSON.parse(metadata);

                // Check if the metadata matches the search criteria
                if (
                    metadataObject.metadata.travelId === travelId &&
                    metadataObject.metadata.bicycleId === bicycleId
                )
                {
                    return true;
                }
            } catch (error)
            {
                // Ignore any errors when reading or parsing metadata files
            }
            return false;
        });

        if (!matchingFile)
        {
            res.status(404).json({ error: 'No matching image found.' });
            return;
        }

        // Return the matching image file
        const imagePath = `uploads/${matchingFile}`;
        res.status(200).sendFile(path.join(__dirname, imagePath));
    });
});


app.listen(port, () =>
{
    console.log(`Server is running on port ${port}`);
});
