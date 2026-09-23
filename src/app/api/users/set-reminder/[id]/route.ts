import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserScheduleNotification } from "@/models/UserScheduleNotification";
import mongoose from "mongoose";
import { ScheduledCronJob } from "@/models/ScheduledCronJob";
import { cronJobRegistry } from "@/cron/cronRegistry";
import { User } from "@/models/User";
import { scheduleReminder } from "@/cron/scheduleReminder";
import { deleteReminder } from "@/cron/deleteReminder";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  const body = await req.json();
  const { time, weekday = [], date } = body;

  // Validation: Either weekday OR date must be provided, not both
  if ((!weekday.length && !date) || (weekday.length && date)) {
    return NextResponse.json(
      {
        message: "You must provide either weekday(s) or a date (not both)",
        status: false,
        data: {},
      },
      { status: 400 }
    );
  }

  try {
    // Upsert one reminder per user
    const reminder = await UserScheduleNotification.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        time,
        weekday,
        date: date ? new Date(date) : null,
      },
      {
        new: true,
        upsert: true, // Create a new document if none found
        runValidators: true,
      }
    );

    // Stop old cron job
    const oldJob = await ScheduledCronJob.findOne({ reminderId: id });
    if (oldJob) {
      const task = cronJobRegistry.get(oldJob.jobKey);
      if (task) {
        task.stop();
        cronJobRegistry.delete(oldJob.jobKey);
      }
      await ScheduledCronJob.deleteOne({ reminderId: id });
    }
    // Schedule new cron job
    const userRecord = await User.findById(reminder.userId);
    if (userRecord?.fcmToken) {
      await scheduleReminder(reminder, userRecord.fcmToken);
    }

    return NextResponse.json({
      message: "Reminder updated successfully",
      data: reminder,
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Error setting reminder" });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  try {
    // Upsert one reminder per user
    const reminder = await UserScheduleNotification.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(id),
    });

    await deleteReminder(id);

    return NextResponse.json({
      message: "Reminder deleted successfully",
      data: reminder,
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Error deleting reminder" });
  }
}
