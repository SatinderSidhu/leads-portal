import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";

const SYSTEM_TEMPLATES = [
  {
    systemKey: "system_welcome",
    title: "Welcome Email",
    subject: "Welcome to {{projectName}}!",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 28px;">Welcome, {{customerName}}!</h1></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">We're excited to get started on <strong>{{projectName}}</strong> with you.</p><p style="color: #333; font-size: 16px; line-height: 1.6;">You can view your project details and stay updated by visiting your personal project portal:</p><div style="text-align: center; margin: 30px 0;"><a href="{{portalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Project</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{portalUrl}}",
  },
  {
    systemKey: "system_status_update",
    title: "Status Update",
    subject: "{{projectName}} — Status Update: {{statusLabel}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">Project Status Update</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">Your project status has been updated to:</p><div style="text-align: center; margin: 20px 0;"><span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 24px; border-radius: 20px; font-size: 18px; font-weight: 600;">{{statusLabel}}</span></div><div style="text-align: center; margin: 30px 0;"><a href="{{portalUrl}}" style="display: inline-block; background: #333; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Project Details</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{statusLabel}}, {{portalUrl}}",
  },
  {
    systemKey: "system_nda_ready",
    title: "NDA Ready",
    subject: "NDA Ready for Review — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">Non-Disclosure Agreement</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">A Non-Disclosure Agreement for <strong>{{projectName}}</strong> has been prepared and is ready for your review and signature.</p><p style="color: #333; font-size: 16px; line-height: 1.6;">You can review the full document online, download a PDF copy, and sign it electronically — all from your project portal.</p><div style="text-align: center; margin: 30px 0;"><a href="{{ndaUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Review &amp; Sign NDA</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{ndaUrl}}",
  },
  {
    systemKey: "system_sow_ready",
    title: "SOW Ready",
    subject: "Scope of Work Ready — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">Scope of Work</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">The Scope of Work (Version {{sowVersion}}) for <strong>{{projectName}}</strong> has been prepared and is ready for your review.</p><p style="color: #333; font-size: 16px; line-height: 1.6;">This document outlines the project deliverables, timeline, and key milestones. Please review it carefully.</p><div style="text-align: center; margin: 30px 0;"><a href="{{sowUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Scope of Work</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{sowVersion}}, {{sowUrl}}, {{portalUrl}}",
  },
  {
    systemKey: "system_app_flow_ready",
    title: "App Flow Ready",
    subject: "App Flow Ready — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">App Flow</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Ready for Your Review</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">The app flow diagram <strong>"{{flowName}}"</strong> for <strong>{{projectName}}</strong> has been prepared and is ready for your review.</p><p style="color: #333; font-size: 16px; line-height: 1.6;">This diagram shows the application's user journey and screen flow. Please review it and leave any comments or feedback.</p><div style="text-align: center; margin: 30px 0;"><a href="{{flowUrl}}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View App Flow</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{flowName}}, {{flowUrl}}",
  },
  {
    systemKey: "system_sow_comment_reply",
    title: "SOW Comment Reply",
    subject: "Reply to SOW Comment — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 20px;">SOW Comment Reply</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px;"><p style="color: #333; font-size: 16px;"><strong>{{adminName}}</strong> replied to your comment:</p><div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">{{commentContent}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{sowUrl}}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View SOW</a></div></div></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{adminName}}, {{commentContent}}, {{sowUrl}}, {{sowVersion}}",
  },
  {
    systemKey: "system_app_flow_comment_reply",
    title: "App Flow Comment Reply",
    subject: "Reply to App Flow Comment — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 20px;">App Flow Comment Reply</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px;"><p style="color: #333; font-size: 16px;"><strong>{{adminName}}</strong> replied to your comment:</p><div style="background: white; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">{{commentContent}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{flowUrl}}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View App Flow</a></div></div></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{adminName}}, {{commentContent}}, {{flowUrl}}, {{flowName}}",
  },
  {
    systemKey: "system_admin_message",
    title: "Admin Message",
    subject: "New Message — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 20px;">New Message</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;"><strong>{{adminName}}</strong> sent you a message:</p><div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{{messageContent}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{portalUrl}}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View & Reply</a></div></div></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{adminName}}, {{messageContent}}, {{portalUrl}}",
  },
  {
    systemKey: "system_nda_signed",
    title: "NDA Signed Confirmation",
    subject: "NDA Signed Successfully — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">NDA Signed Successfully</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">This confirms that the Non-Disclosure Agreement for <strong>{{projectName}}</strong> has been successfully signed.</p><div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;"><p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> {{signerName}}</p><p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> {{signedDate}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{portalUrl}}" style="display: inline-block; background: #333; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Project</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{signerName}}, {{signedDate}}, {{portalUrl}}",
  },
  {
    systemKey: "system_sow_signed",
    title: "SOW Signed Confirmation",
    subject: "Scope of Work Approved — {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 24px;">SOW Approved</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">This confirms that the Scope of Work (v{{sowVersion}}) for <strong>{{projectName}}</strong> has been approved and signed.</p><div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;"><p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> {{signerName}}</p><p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> {{signedDate}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{portalUrl}}" style="display: inline-block; background: #333; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Project</a></div></div><p style="color: #999; font-size: 13px; text-align: center;">If you have any questions, simply reply to this email.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectName}}, {{signerName}}, {{signedDate}}, {{sowVersion}}, {{portalUrl}}",
  },
  {
    systemKey: "system_task_assigned",
    title: "Task Assigned",
    subject: "Task Assigned: {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #01358d 0%, #2870a8 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 20px;">New Task Assigned</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;"><strong>{{assignedBy}}</strong> assigned you a task on <strong>{{projectName}}</strong>:</p><div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">{{taskContent}}</p><p style="color: #666; font-size: 13px; margin: 8px 0 0;">Due: {{dueDate}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{leadUrl}}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a></div></div></div>`,
    notes: "Merge tags: {{projectName}}, {{assignedBy}}, {{taskContent}}, {{dueDate}}, {{leadUrl}}",
  },
  {
    systemKey: "system_task_completed",
    title: "Task Completed",
    subject: "Task Completed: {{projectName}}",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 20px;">Task Completed</h1><p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 15px;">{{projectName}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;"><strong>{{completedBy}}</strong> completed a task on <strong>{{projectName}}</strong>:</p><div style="background: white; border-left: 4px solid #059669; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0; text-decoration: line-through;">{{taskContent}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{leadUrl}}" style="display: inline-block; background: #01358d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Lead</a></div></div></div>`,
    notes: "Merge tags: {{projectName}}, {{completedBy}}, {{taskContent}}, {{leadUrl}}",
  },
  // ── App Factory System Templates ──
  {
    systemKey: "system_appfactory_welcome",
    title: "App Factory — Welcome",
    subject: "Welcome to App Factory! Your project has been created",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #2870a8 0%, #01358d 50%, #101b63 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 22px;">👋 Welcome to App Factory</h1><p style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size: 14px;">by KITLabs</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">Your first project has been created! Our AI is generating your app design — head to the Design tab to see it come to life.</p><div style="text-align: center; margin: 30px 0;"><a href="{{projectLink}}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Your Project</a></div></div><p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you created a project on App Factory by KITLabs.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{projectLink}}",
  },
  {
    systemKey: "system_appfactory_build_submitted",
    title: "App Factory — Build Submitted",
    subject: "Your app build has been submitted (v{{buildVersion}})",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #2870a8 0%, #01358d 50%, #101b63 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 22px;">📤 Build Submitted</h1><p style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size: 14px;">Version {{buildVersion}}</p></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">Your app (v{{buildVersion}}) has been submitted to our team. We'll notify you as we progress through review, development, and testing.</p><div style="text-align: center; margin: 30px 0;"><a href="{{projectLink}}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">Track Progress</a></div></div><p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you have a project on App Factory by KITLabs.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{buildVersion}}, {{projectLink}}",
  },
  {
    systemKey: "system_appfactory_build_update",
    title: "App Factory — Build Status Update",
    subject: "{{statusTitle}} — Your App Build",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #2870a8 0%, #01358d 50%, #101b63 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 22px;">{{statusEmoji}} {{statusTitle}}</h1></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">{{statusBody}}</p>{{#if teamNotes}}<div style="background: white; border-left: 4px solid #01358d; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="color: #666; font-size: 14px; margin: 0;"><strong>Note from team:</strong> {{teamNotes}}</p></div>{{/if}}<div style="text-align: center; margin: 30px 0;"><a href="{{projectLink}}" style="display: inline-block; background: #01358d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Status</a></div></div><p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you have a project on App Factory by KITLabs.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{statusTitle}}, {{statusEmoji}}, {{statusBody}}, {{teamNotes}}, {{projectLink}}",
  },
  {
    systemKey: "system_appfactory_enhancement_update",
    title: "App Factory — Enhancement Update",
    subject: "{{statusTitle}} — Your Enhancement Request",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;"><div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;"><h1 style="color: white; margin: 0; font-size: 22px;">✨ {{statusTitle}}</h1></div><div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;"><p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customerName}},</p><p style="color: #333; font-size: 16px; line-height: 1.6;">{{statusBody}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{projectLink}}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">View Enhancement</a></div></div><p style="color: #999; font-size: 12px; text-align: center;">You're receiving this because you have a project on App Factory by KITLabs.</p></div>`,
    notes: "Merge tags: {{customerName}}, {{statusTitle}}, {{statusBody}}, {{projectLink}}",
  },
];

export async function POST() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let created = 0;
    let skipped = 0;

    for (const tpl of SYSTEM_TEMPLATES) {
      // Use findFirst instead of findUnique for broader compatibility
      const existing = await prisma.emailTemplate.findFirst({ where: { systemKey: tpl.systemKey } });
      if (existing) { skipped++; continue; }

      await prisma.emailTemplate.create({
        data: {
          title: tpl.title,
          subject: tpl.subject,
          body: tpl.body,
          purpose: "NOTIFICATION" as const,
          systemKey: tpl.systemKey,
          tags: [],
          notes: tpl.notes,
          createdBy: session.name,
        },
      });
      created++;
    }

    return NextResponse.json({ created, skipped, total: SYSTEM_TEMPLATES.length });
  } catch (error) {
    console.error("[Seed System Templates] Error:", error);
    return NextResponse.json({ error: "Failed to seed templates", detail: String(error) }, { status: 500 });
  }
}
