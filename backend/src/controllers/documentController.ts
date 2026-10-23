import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DocumentRecord } from '../models/Document';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'Please select a file to upload.' });
      return;
    }

    const { documentName, documentType, relatedEntityType, relatedEntityId, relatedEntityName, project, description } = req.body;
    const projectRef = project || (relatedEntityType === 'Project' ? relatedEntityId : undefined);

    const docRecord = await DocumentRecord.create({
      documentName: documentName?.trim() || file.originalname,
      documentType: documentType?.trim() || 'Technical Document',
      relatedEntityType: relatedEntityType || 'General',
      relatedEntityId: relatedEntityId || '',
      relatedEntityName: relatedEntityName || '',
      project: projectRef || undefined,
      filePath: file.filename, // Store relative filename inside uploads folder
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user?._id,
      uploaderName: req.user?.name || 'System User',
      uploadDate: new Date(),
      description: description?.trim() || '',
    });

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'Document',
      entityId: docRecord._id.toString(),
      project: projectRef,
      details: `Uploaded document "${docRecord.documentName}" for [${docRecord.relatedEntityType}]`,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      document: docRecord,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { relatedEntityType, relatedEntityId, project, search } = req.query;

    const filter: any = {};
    if (project) {
      filter.$or = [
        { project },
        { relatedEntityType: 'Project', relatedEntityId: project.toString() },
      ];
    }
    if (relatedEntityType) filter.relatedEntityType = relatedEntityType;
    if (relatedEntityId) filter.relatedEntityId = relatedEntityId;
    if (search && typeof search === 'string') {
      filter.$or = [
        { documentName: { $regex: search, $options: 'i' } },
        { documentType: { $regex: search, $options: 'i' } },
        { uploaderName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const documents = await DocumentRecord.find(filter).sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentRecord.findById(id);

    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    res.status(200).json({ success: true, document: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentRecord.findById(id);

    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    const fullPath = path.resolve(__dirname, '../../uploads', doc.filePath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, message: 'Physical file not found on server storage.' });
      return;
    }

    res.download(fullPath, doc.documentName);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentRecord.findById(id);

    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    // Delete local file if it exists
    const fullPath = path.resolve(__dirname, '../../uploads', doc.filePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Failed to delete physical file:', err);
      }
    }

    await DocumentRecord.findByIdAndDelete(id);

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_DOCUMENT',
      entityType: 'Document',
      entityId: id,
      details: `Deleted document "${doc.documentName}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
