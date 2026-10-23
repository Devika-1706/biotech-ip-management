import mongoose, { Document, Schema } from 'mongoose';

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IProject extends Document {
  name: string;
  code: string;
  description: string;
  department: string;
  projectManager: mongoose.Types.ObjectId | string;
  projectManagerName?: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  teamMembers?: string[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Project code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'Oncology R&D',
    },
    projectManager: {
      type: Schema.Types.Mixed,
      default: null,
    },
    projectManagerName: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'],
      default: 'Planning',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    teamMembers: {
      type: [String],
      default: [],
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

// Indexes for fast searching and filtering
ProjectSchema.index({ name: 'text', code: 'text', description: 'text', department: 'text' });
ProjectSchema.index({ status: 1, priority: 1, department: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
