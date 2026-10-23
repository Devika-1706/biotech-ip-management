import { Response } from 'express';
import { User, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../models/ActivityLog';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search, status } = req.query;
    const filter: any = {};

    if (role && typeof role === 'string') {
      filter.role = role;
    }
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }
    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isActive, department, name } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (role) {
      const validRoles: UserRole[] = ['ADMIN', 'IP MANAGER', 'RESEARCHER'];
      if (validRoles.includes(role)) {
        user.role = role;
      }
    }

    if (isActive !== undefined) {
      // Prevent admin from deactivating themselves
      if (req.user && req.user._id.toString() === id && isActive === false) {
        res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own account.' });
        return;
      }
      user.isActive = Boolean(isActive);
    }

    if (department) user.department = department.trim();
    if (name) user.name = name.trim();

    await user.save();

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Updated user profile/status for ${user.email} (Role: ${user.role}, Active: ${user.isActive})`,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user && req.user._id.toString() === id) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
      return;
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    await logActivity({
      user: req.user?._id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      details: `Deleted user record ${user.email}`,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
