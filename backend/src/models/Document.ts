import mongoose, { Document as MongoDocument, Schema } from 'mongoose';

export type RelatedEntityType =
  | 'Project'
  | 'Patent'
  | 'TechnologyDisclosure'
  | 'LicensingAgreement'
  | 'RegulatoryFiling'
  | 'ComplianceItem'
  | 'ResearchCollaboration'
  | 'General';

export interface IDocumentRecord extends MongoDocument {
  documentName: string;
  documentType: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId?: string;
  relatedEntityName?: string;
  project?: mongoose.Types.ObjectId;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: mongoose.Types.ObjectId;
  uploaderName?: string;
  uploadDate: Date;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocumentRecord>(
  {
    documentName: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
      default: 'Technical Specification',
    },
    relatedEntityType: {
      type: String,
      enum: [
        'Project',
        'Patent',
        'TechnologyDisclosure',
        'LicensingAgreement',
        'RegulatoryFiling',
        'ComplianceItem',
        'ResearchCollaboration',
        'General',
      ],
      default: 'General',
    },
    relatedEntityId: {
      type: String,
      default: '',
    },
    relatedEntityName: {
      type: String,
      default: '',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploaderName: {
      type: String,
      default: 'System User',
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

DocumentRecordSchema.index({ documentName: 'text', description: 'text' });
DocumentRecordSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
DocumentRecordSchema.index({ project: 1 });

export const DocumentRecord = mongoose.model<IDocumentRecord>('DocumentRecord', DocumentRecordSchema);
