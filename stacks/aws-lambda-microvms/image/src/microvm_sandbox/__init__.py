"""Code-execution sandbox served inside an AWS Lambda MicroVM.

The package runs two ASGI servers in one process (see :mod:`microvm_sandbox.main`):

- the **traffic** server (data-plane port ``8080``) — the ``/exec`` sandbox that
  runs caller-supplied Python in a persistent session namespace, and
- the **hooks** server (control port ``9000``) — the MicroVM lifecycle hooks
  (``/run``, ``/resume``, ``/suspend``, ``/terminate``, plus the build-time
  ``/ready`` and ``/validate``).

The MicroVM itself is the isolation boundary, so the sandbox runs code directly
rather than re-sandboxing inside the guest.
"""
