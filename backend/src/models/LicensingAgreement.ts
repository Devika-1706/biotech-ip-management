import mongoose, { Document, Schema } from 'mongoose';

export type AgreementStatus = 'Draft' | 'Negotiation' | 'Active' | 'Expired' | 'Terminated';

export interface ILicensingAgreement extends Document {
  agreementName: string;
  agreementId: string;
  patent?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  licensee: string;
  licensor: string;
  agreementType: string;
  startDate: Date;
  endDate: Date;
  royaltyInfo: string;
  status: AgreementStatus;
  description: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LicensingAgreementSchema = new Schema<ILicensingAgreement>(
  {
    agreementName: {
      type: String,
      required: [true, 'Agreement name is required'],
      trim: true,
    },
    agreementId: {
      type: String,
      required: [true, 'Agreement ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    patent: {
      type: Schema.Types.ObjectId,
      ref: 'Patent',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    licensee: {
      type: String,
      required: [true, 'Licensee organization is required'],
      trim: true,
    },
    licensor: {
      type: String,
      required: [true, 'Licensor entity is required'],
      trim: true,
      default: 'BioVault Therapeutics Inc.',
    },
    agreementType: {
      type: String,
      required: [true, 'Agreement type is required'],
      trim: true,
      default: 'Exclusive Commercial License',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End/Expiration date is required'],
    },
    royaltyInfo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Draft', 'Negotiation', 'Active', 'Expired', 'Terminated'],
      default: 'Draft',
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

LicensingAgreementSchema.index({ agreementName: 'text', agreementId: 'text', licensee: 'text', description: 'text' });
LicensingAgreementSchema.index({ status: 1, endDate: 1 });

export const LicensingAgreement = mongoose.model<ILicensingAgreement>(
  'LicensingAgreement',
  LicensingAgreementSchema
);
