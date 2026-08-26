const express = require('express')
const router = express.Router()
const FamilyMember = require('../models/FamilyMember')
const { optionalAuth } = require('../middleware/auth')

// GET /api/family - Get all family members for user
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const members = await FamilyMember.find({ userId }).sort({ createdAt: 1 })
    res.json(members)
  } catch (err) {
    console.error('Error fetching family members:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/family - Create a new family member
router.post('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const newMember = new FamilyMember({
      ...req.body,
      userId
    })
    
    await newMember.save()
    console.log(`✅ Family member added: ${newMember.name} (${newMember.relationship}) for user ${userId}`)
    res.status(201).json(newMember)
  } catch (err) {
    console.error('Error in POST /api/family:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/family/:id - Update a family member
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    )
    if (!member) return res.status(404).json({ error: 'Not found or unauthorized' })
    console.log(`✅ Family member updated: ${member.name} for user ${userId}`)
    res.json(member)
  } catch (err) {
    console.error('Error updating family member:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/family/:id - Delete a family member
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : (req.userId || 'guest_user')
    const member = await FamilyMember.findOneAndDelete({ _id: req.params.id, userId })
    if (!member) return res.status(404).json({ error: 'Not found or unauthorized' })
    console.log(`✅ Family member deleted: ${req.params.id} for user ${userId}`)
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Error deleting family member:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
