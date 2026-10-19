import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  fileChecksum: {
    type: String,
    required: true
  },
  fileSizeBytes: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  errorMessage: {
    type: String
  }
}, { timestamps: true });

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
