import mongoose, { Document, Schema } from 'mongoose';

export type ComplianceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type ComplianceRisk = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IComplianceItem extends Document {
  complianceItem: string;
  category: string;
  project: mongoose.Types.ObjectId;
  responsiblePerson: string;
  dueDate: Date;
  status: ComplianceStatus;
  riskLevel: ComplianceRisk;
  description: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceItemSchema = new Schema<IComplianceItem>(
  {
    complianceItem: {
      type: String,
      required: [true, 'Compliance item title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'Biosafety (BSL-2/3)',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project is required'],
    },
    responsiblePerson: {
      type: String,
      required: [true, 'Responsible officer/person is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Compliance due date is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
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

ComplianceItemSchema.index({ complianceItem: 'text', category: 'text', description: 'text' });
ComplianceItemSchema.index({ status: 1, riskLevel: 1, dueDate: 1, project: 1 });

export const ComplianceItem = mongoose.model<IComplianceItem>(
  'ComplianceItem',
  ComplianceItemSchema
);
