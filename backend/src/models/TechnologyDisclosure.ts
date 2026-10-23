import mongoose, { Document, Schema } from 'mongoose';

export type DisclosureStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Converted to Patent';
export type DisclosurePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ITechnologyDisclosure extends Document {
  title: string;
  disclosureId: string;
  inventor: string;
  project: mongoose.Types.ObjectId;
  description: string;
  submissionDate: Date;
  reviewStatus: DisclosureStatus;
  reviewer?: string;
  priority: DisclosurePriority;
  decision?: string;
  convertedPatent?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TechnologyDisclosureSchema = new Schema<ITechnologyDisclosure>(
  {
    title: {
      type: String,
      required: [true, 'Disclosure title is required'],
      trim: true,
    },
    disclosureId: {
      type: String,
      required: [true, 'Disclosure ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    inventor: {
      type: String,
      required: [true, 'Lead inventor is required'],
      trim: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project is required'],
    },
    description: {
      type: String,
      default: '',
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    reviewStatus: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted to Patent'],
      default: 'Submitted',
    },
    reviewer: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    decision: {
      type: String,
      default: '',
    },
    convertedPatent: {
      type: Schema.Types.ObjectId,
      ref: 'Patent',
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

TechnologyDisclosureSchema.index({ title: 'text', disclosureId: 'text', inventor: 'text', description: 'text' });
TechnologyDisclosureSchema.index({ reviewStatus: 1, priority: 1, project: 1 });

export const TechnologyDisclosure = mongoose.model<ITechnologyDisclosure>(
  'TechnologyDisclosure',
  TechnologyDisclosureSchema
);
