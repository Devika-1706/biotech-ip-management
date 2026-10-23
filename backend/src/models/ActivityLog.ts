import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  user?: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  project?: mongoose.Types.ObjectId;
  details: string;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'ADMIN',
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      default: '',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    details: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ project: 1, timestamp: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export const logActivity = async (data: {
  user?: any;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  project?: any;
  details: string;
}) => {
  try {
    await ActivityLog.create({
      user: data.user?._id || data.user,
      userName: data.userName || data.user?.name || 'Authorized User',
      userRole: data.userRole || data.user?.role || 'RESEARCHER',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || '',
      project: data.project?._id || data.project || undefined,
      details: data.details,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};
