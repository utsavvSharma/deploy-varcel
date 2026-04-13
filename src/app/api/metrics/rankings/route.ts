import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get current month's first and last day
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const salesData = await prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        status: 'CONVERTED',
        assignedTo: { not: null },
        convertedAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _sum: {
        saleAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get user details for all salespeople
    const userIds = salesData
      .map(data => data.assignedTo)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    // Create a map for quick user lookup
    const userMap = new Map(users.map(u => [u.id, u]));

    // Build rankings with user data
    const rankings = salesData
      .map(data => ({
        user: {
          id: data.assignedTo!,
          name: userMap.get(data.assignedTo!)?.name || 'Unknown',
        },
        totalAmount: Number(data._sum?.saleAmount || 0),
        totalSales: data._count.id,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Error fetching sales rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales rankings" },
      { status: 500 }
    );
  }
}
