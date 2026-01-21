const fs = require('fs');
const path = require('path');
const ApiResponse = require('../utils/response.util');

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, '../../uploads');
const borrowersDir = path.join(uploadsDir, 'borrowers');
const proofsDir = path.join(uploadsDir, 'proofs');

[uploadsDir, borrowersDir, proofsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Dummy File Upload Handler
 * In production, use multer or similar library
 * This simulates file upload by accepting base64 strings
 */
const handleFileUpload = (req, res, next) => {
  try {
    // Check for profile image in base64
    if (req.body.profile_image_base64) {
      const base64Data = req.body.profile_image_base64.replace(/^data:image\/\w+;base64,/, '');
      const fileName = `borrower_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = path.join(borrowersDir, fileName);
      
      // Save file (dummy)
      fs.writeFileSync(filePath, base64Data, 'base64');
      
      // Store relative path
      req.uploadedFiles = req.uploadedFiles || {};
      req.uploadedFiles.profile_image = `/uploads/borrowers/${fileName}`;
      
      // Remove base64 from body to avoid storing in DB
      delete req.body.profile_image_base64;
    }

    // Check for ID proof in base64
    if (req.body.id_proof_base64) {
      const base64Data = req.body.id_proof_base64.replace(/^data:image\/\w+;base64,/, '');
      const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = path.join(proofsDir, fileName);
      
      // Save file (dummy)
      fs.writeFileSync(filePath, base64Data, 'base64');
      
      req.uploadedFiles = req.uploadedFiles || {};
      req.uploadedFiles.id_proof = `/uploads/proofs/${fileName}`;
      
      delete req.body.id_proof_base64;
    }

    next();
  } catch (error) {
    console.error('File Upload Error:', error);
    return ApiResponse.badRequest(res, 'File upload failed');
  }
};

/**
 * Validate file type (dummy validation)
 */
const validateFileType = (base64String) => {
  const validTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:application/pdf'];
  return validTypes.some(type => base64String.startsWith(type));
};

/**
 * Delete uploaded file
 */
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error('Delete File Error:', error);
  }
  return false;
};

/**
 * Validate file size (max 5MB for base64)
 */
const validateFileSize = (base64String, maxSizeMB = 5) => {
  const sizeInBytes = Buffer.from(base64String.split(',')[1] || '', 'base64').length;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
};

module.exports = {
  handleFileUpload,
  validateFileType,
  validateFileSize,
  deleteFile
};