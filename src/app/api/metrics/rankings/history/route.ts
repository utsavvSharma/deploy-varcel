import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 3; // Default to last 3 months

    // Get unique month-year combinations from historical data
    const historicalData = await prisma.monthlySalesRanking.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      distinct: ['month', 'year'],
      take: limit,
    });

    // Get all rankings for those months
    const monthlyRankings = await Promise.all(
      historicalData.map(async (data) => {
        const rankings = await prisma.monthlySalesRanking.findMany({
          where: {
            month: data.month,
            year: data.year,
          },
          orderBy: {
            rank: 'asc',
          },
        });

        return {
          month: data.month,
          year: data.year,
          rankings: rankings.map(r => ({
            rank: r.rank,
            user: {
              id: r.userId,
              name: r.userName,
            },
            totalAmount: Number(r.totalAmount),
            totalSales: r.totalSales,
          })),
        };
      })
    );

    return NextResponse.json({ history: monthlyRankings });
  } catch (error) {
    console.error("Error fetching ranking history:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking history" },
      { status: 500 }
    );
  }
}
