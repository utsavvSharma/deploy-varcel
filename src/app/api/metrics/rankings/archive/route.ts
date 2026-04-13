import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This endpoint should be called on the 1st of each month to archive the previous month's rankings
export async function POST(request: Request) {
  try {
    // Get the previous month
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = previousMonth.getMonth() + 1; // 1-12
    const year = previousMonth.getFullYear();

    // Get first and last day of previous month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59, 999);

    // Get sales data for previous month
    const salesData = await prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        status: 'CONVERTED',
        assignedTo: { not: null },
        convertedAt: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      _sum: {
        saleAmount: true,
      },
      _count: {
        id: true,
      },
    });

    if (salesData.length === 0) {
      return NextResponse.json({ 
        message: "No sales data for the previous month",
        month,
        year
      });
    }

    // Get user details
    const userIds = salesData
      .map(data => data.assignedTo)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Build rankings
    const rankings = salesData
      .map(data => ({
        userId: data.assignedTo!,
        userName: userMap.get(data.assignedTo!)?.name || 'Unknown',
        totalAmount: Number(data._sum?.saleAmount || 0),
        totalSales: data._count.id,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        month,
        year,
      }));

    // Delete existing records for this month (if running multiple times)
    await prisma.monthlySalesRanking.deleteMany({
      where: {
        month,
        year,
      },
    });

    // Save rankings to database
    await prisma.monthlySalesRanking.createMany({
      data: rankings,
    });

    return NextResponse.json({ 
      message: "Monthly rankings archived successfully",
      month,
      year,
      count: rankings.length,
      rankings
    });
  } catch (error) {
    console.error("Error archiving monthly rankings:", error);
    return NextResponse.json(
      { error: "Failed to archive monthly rankings" },
      { status: 500 }
    );
  }
}
