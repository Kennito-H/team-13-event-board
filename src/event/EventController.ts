import { Request, Response } from "express"
import { EventService } from "../service/EventService"

export const EventController = {
  showCreateForm(req: Request, res: Response) {
    return res.render("events/create")
  },

  handleCreate(req: Request, res: Response) {
    const data = req.body
    const user = req.session.user

    const result = EventService.createEvent(data, user.id)

    if (!result.ok) {
      return res.status(400).send(result.error.message)
    }

    return res.redirect(`/events/${result.value.id}`)
  }
}