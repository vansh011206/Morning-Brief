import React from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ArrowLeft } from 'lucide-react'
import { Button, EmptyState } from '../components/ui'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-16">
      <EmptyState
        icon={<HelpCircle className="w-6 h-6" />}
        title="Page Not Found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link to="/today">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Today's Briefing
            </Button>
          </Link>
        }
      />
    </div>
  )
}
