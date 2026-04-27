import { Router } from 'express';
import { Hive } from '../models/Hive.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const hives = await Hive.find({ uid: req.user.uid }).lean();
    
    const alerts = [];
    let idCounter = 1;

    for (const hive of hives) {
      if (hive.health_status === 'poor') {
        alerts.push({
          id: String(idCounter++),
          type: 'critical',
          title: `Hive ${hive.hive_id} — Critical Health`,
          desc: 'Health status marked as poor. Immediate attention required.',
          source: 'Hive Monitor',
          unread: true
        });
      } else if (hive.health_status === 'fair') {
        alerts.push({
          id: String(idCounter++),
          type: 'warning',
          title: `Hive ${hive.hive_id} — Health Warning`,
          desc: 'Health status is fair. Monitor closely.',
          source: 'Hive Monitor',
          unread: false
        });
      }

      if (hive.queen_status === 'missing') {
        alerts.push({
          id: String(idCounter++),
          type: 'critical',
          title: `Hive ${hive.hive_id} — Queen Missing`,
          desc: 'Queen bee reported missing. Requeening recommended.',
          source: 'Hive Monitor',
          unread: true
        });
      }

      if (hive.last_inspection_date) {
        const daysSince = (Date.now() - new Date(hive.last_inspection_date).getTime()) / (1000 * 3600 * 24);
        if (daysSince > 14) {
          alerts.push({
            id: String(idCounter++),
            type: 'warning',
            title: `Hive ${hive.hive_id} — Overdue check`,
            desc: `Last inspection was ${Math.round(daysSince)} days ago.`,
            source: 'Schedule',
            unread: true
          });
        }
      } else {
        alerts.push({
          id: String(idCounter++),
          type: 'info',
          title: `Hive ${hive.hive_id} — No Inspection Record`,
          desc: 'Please perform an initial inspection.',
          source: 'System',
          unread: false
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        id: String(idCounter++),
        type: 'success',
        title: 'All Hives Healthy',
        desc: 'All monitored hives are in good condition.',
        source: 'System',
        unread: false
      });
    }

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
