import mongoose, { Document, Schema } from 'mongoose';

export type CollaborationStatus = 'Proposed' | 'Active' | 'Completed' | 'Terminated';

export interface IResearchCollaboration extends Document {
  collaborationName: string;
  collaborationId: string;
  project: mongoose.Types.ObjectId;
  partnerOrganization: string;
  leadResearcher: string;
  startDate: Date;
  endDate?: Date;
  collaborationType: string;
  status: CollaborationStatus;
  description: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchCollaborationSchema = new Schema<IResearchCollaboration>(
  {
    collaborationName: {
      type: String,
      required: [true, 'Collaboration name is required'],
      trim: true,
    },
    collaborationId: {
      type: String,
      required: [true, 'Collaboration ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project is required'],
    },
    partnerOrganization: {
      type: String,
      required: [true, 'Partner organization is required'],
      trim: true,
    },
    leadResearcher: {
      type: String,
      required: [true, 'Lead researcher is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    collaborationType: {
      type: String,
      required: [true, 'Collaboration type is required'],
      trim: true,
      default: 'Co-Development',
    },
    status: {
      type: String,
      enum: ['Proposed', 'Active', 'Completed', 'Terminated'],
      default: 'Proposed',
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

ResearchCollaborationSchema.index({
  collaborationName: 'text',
  collaborationId: 'text',
  partnerOrganization: 'text',
  leadResearcher: 'text',
});
ResearchCollaborationSchema.index({ status: 1, project: 1 });

export const ResearchCollaboration = mongoose.model<IResearchCollaboration>(
  'ResearchCollaboration',
  ResearchCollaborationSchema
);
