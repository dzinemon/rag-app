import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { SubmissionStatus } from '@prisma/client';

// Validation schema for contact form submission
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  companyName: z.string().max(255, 'Company name too long').optional(),
  phoneNumber: z.string().max(50, 'Phone number too long').optional(),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  message: z.string().min(1, 'Message is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the input
    const validatedData = contactFormSchema.parse(body);
    
    // Store in database
    const submission = await prisma.contactFormSubmission.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        companyName: validatedData.companyName || null,
        phoneNumber: validatedData.phoneNumber || null,
        subject: validatedData.subject,
        message: validatedData.message,
        status: 'NEW',
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully! We will get back to you soon.',
      submissionId: submission.id,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.errors,
        },
        { status: 400 }
      );
    }
    
    console.error('Contact form submission error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit contact form. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// Get all contact form submissions (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const where = status ? { status: status as SubmissionStatus } : {};
    
    const submissions = await prisma.contactFormSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    const total = await prisma.contactFormSubmission.count({ where });
    
    return NextResponse.json({
      success: true,
      data: submissions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
    
  } catch (error) {
    console.error('Contact form fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch contact form submissions.',
      },
      { status: 500 }
    );
  }
}
