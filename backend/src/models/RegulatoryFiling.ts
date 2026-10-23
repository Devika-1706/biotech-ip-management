import mongoose, { Document, Schema } from 'mongoose';

export type FilingStatus = 'Draft' | 'Prepared' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export interface IRegulatoryFiling extends Document {
  filingName: string;
  filingId: string;
  project: mongoose.Types.ObjectId;
  regulatoryAuthority: string;
  filingType: string;
  submissionDate?: Date;
  dueDate: Date;
  status: FilingStatus;
  responsiblePerson: string;
  description: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RegulatoryFilingSchema = new Schema<IRegulatoryFiling>(
  {
    filingName: {
      type: String,
      required: [true, 'Filing name is required'],
      trim: true,
    },
    filingId: {
      type: String,
      required: [true, 'Filing ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project is required'],
    },
    regulatoryAuthority: {
      type: String,
      required: [true, 'Regulatory authority is required'],
      trim: true,
      default: 'FDA (United States)',
    },
    filingType: {
      type: String,
      required: [true, 'Filing type is required'],
      trim: true,
      default: 'IND (Investigational New Drug)',
    },
    submissionDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: [true, 'Regulatory deadline / due date is required'],
    },
    status: {
      type: String,
      enum: ['Draft', 'Prepared', 'Submitted', 'Under Review', 'Approved', 'Rejected'],
      default: 'Draft',
    },
    responsiblePerson: {
      type: String,
      required: [true, 'Responsible person is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

RegulatoryFilingSchema.index({ filingName: 'text', filingId: 'text', regulatoryAuthority: 'text', description: 'text' });
RegulatoryFilingSchema.index({ status: 1, dueDate: 1, project: 1 });

export const RegulatoryFiling = mongoose.model<IRegulatoryFiling>(
  'RegulatoryFiling',
  RegulatoryFilingSchema
);
