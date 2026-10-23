import mongoose, { Document, Schema } from 'mongoose';

export type PatentStatus = 'Draft' | 'Filed' | 'Under Examination' | 'Granted' | 'Rejected' | 'Expired';

export interface IPatent extends Document {
  title: string;
  patentNumber: string;
  inventors: string[];
  project: mongoose.Types.ObjectId;
  filingDate: Date;
  priorityDate?: Date;
  applicationStatus: PatentStatus;
  jurisdiction: string;
  owner: string;
  expiryDate?: Date;
  description: string;
  technologyDisclosure?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatentSchema = new Schema<IPatent>(
  {
    title: {
      type: String,
      required: [true, 'Patent title is required'],
      trim: true,
    },
    patentNumber: {
      type: String,
      required: [true, 'Patent number is required'],
      unique: true,
      trim: true,
    },
    inventors: {
      type: [String],
      required: [true, 'At least one inventor is required'],
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project is required'],
    },
    filingDate: {
      type: Date,
      required: [true, 'Filing date is required'],
      default: Date.now,
    },
    priorityDate: {
      type: Date,
    },
    applicationStatus: {
      type: String,
      enum: ['Draft', 'Filed', 'Under Examination', 'Granted', 'Rejected', 'Expired'],
      default: 'Draft',
    },
    jurisdiction: {
      type: String,
      required: [true, 'Jurisdiction is required'],
      trim: true,
      default: 'USPTO (US)',
    },
    owner: {
      type: String,
      required: [true, 'Owner entity is required'],
      trim: true,
      default: 'BioVault Therapeutics Inc.',
    },
    expiryDate: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
    },
    technologyDisclosure: {
      type: Schema.Types.ObjectId,
      ref: 'TechnologyDisclosure',
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

PatentSchema.index({ title: 'text', patentNumber: 'text', inventors: 'text', description: 'text' });
PatentSchema.index({ applicationStatus: 1, jurisdiction: 1, expiryDate: 1, project: 1 });

export const Patent = mongoose.model<IPatent>('Patent', PatentSchema);
